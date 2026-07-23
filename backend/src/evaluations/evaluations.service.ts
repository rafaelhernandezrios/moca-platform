import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Evaluation, EvaluationDocument } from './schemas/evaluation.schema';
import { PatientsService } from '../patients/patients.service';

export interface CompleteEvaluationDto {
  visuospatial: number;
  naming: number;
  attention: number;
  language: number;
  abstraction: number;
  delayedRecall: number;
  orientation: number;
  educationAdjust?: boolean;
}

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectModel(Evaluation.name) private evaluationModel: Model<EvaluationDocument>,
    private patientsService: PatientsService,
  ) {}

  async create(professionalId: string, patientId: string): Promise<{ testId: string; evaluationId: string }> {
    await this.patientsService.findOne(patientId, professionalId);
    const testId = randomUUID();
    const evalDoc = await this.evaluationModel.create({
      testId,
      patientId,
      professionalId,
      status: 'in_progress',
    });
    return { testId, evaluationId: evalDoc._id.toString() };
  }

  async findByTestId(testId: string, professionalId: string): Promise<EvaluationDocument | null> {
    const evalDoc = await this.evaluationModel.findOne({ testId }).exec();
    if (!evalDoc) return null;
    if (evalDoc.professionalId !== professionalId) return null;
    return evalDoc;
  }

  async completeByTestId(professionalId: string, testId: string, dto: CompleteEvaluationDto): Promise<EvaluationDocument> {
    const evalDoc = await this.evaluationModel.findOne({ testId }).exec();
    if (!evalDoc) throw new NotFoundException('Evaluación no encontrada.');
    if (evalDoc.professionalId !== professionalId) {
      throw new ForbiddenException('No tiene acceso a esta evaluación.');
    }
    if (evalDoc.status === 'completed') {
      throw new BadRequestException('Esta evaluación ya fue completada.');
    }
    const total = Math.min(
      30,
      dto.visuospatial + dto.naming + dto.attention + dto.language + dto.abstraction + dto.delayedRecall + dto.orientation + (dto.educationAdjust ? 1 : 0)
    );
    evalDoc.visuospatial = dto.visuospatial;
    evalDoc.naming = dto.naming;
    evalDoc.attention = dto.attention;
    evalDoc.language = dto.language;
    evalDoc.abstraction = dto.abstraction;
    evalDoc.delayedRecall = dto.delayedRecall;
    evalDoc.orientation = dto.orientation;
    evalDoc.total = total;
    evalDoc.educationAdjust = dto.educationAdjust ?? false;
    evalDoc.status = 'completed';
    evalDoc.completedAt = new Date();
    await evalDoc.save();
    return evalDoc;
  }

  async findAllByProfessional(professionalId: string, patientId?: string): Promise<EvaluationDocument[]> {
    const filter: { professionalId: string; patientId?: string } = { professionalId };
    if (patientId) filter.patientId = patientId;
    return this.evaluationModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, professionalId: string): Promise<EvaluationDocument> {
    const evalDoc = await this.evaluationModel.findById(id).exec();
    if (!evalDoc) throw new NotFoundException('Evaluación no encontrada.');
    if (evalDoc.professionalId !== professionalId) {
      throw new ForbiddenException('No tiene acceso a esta evaluación.');
    }
    return evalDoc;
  }

  private recomputeTotal(evalDoc: EvaluationDocument): number {
    return Math.min(
      30,
      evalDoc.visuospatial +
        evalDoc.naming +
        evalDoc.attention +
        evalDoc.language +
        evalDoc.abstraction +
        evalDoc.delayedRecall +
        evalDoc.orientation +
        (evalDoc.educationAdjust ? 1 : 0),
    );
  }

  async setEducationAdjust(id: string, professionalId: string, educationAdjust: boolean): Promise<EvaluationDocument> {
    const evalDoc = await this.findOne(id, professionalId);
    evalDoc.educationAdjust = educationAdjust;
    evalDoc.total = this.recomputeTotal(evalDoc);
    await evalDoc.save();
    return evalDoc;
  }
}
