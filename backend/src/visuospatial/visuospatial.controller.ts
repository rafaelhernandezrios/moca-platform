import { Controller, Post, Body, Param } from '@nestjs/common';
import { VisuospatialService } from './visuospatial.service';
import { VisuospatialSubmissionDTO, VisuospatialTaskId } from '@moca/shared';

@Controller('tests/:testId/visuospatial')
export class VisuospatialController {
    constructor(private readonly visuospatialService: VisuospatialService) { }

    @Post(':taskId/submissions')
    async submitTask(
        @Param('testId') testId: string,
        @Param('taskId') taskId: string,
        @Body() body: { imageBase64: string; metadata: { timestamp: number; deviceType?: string } },
    ) {
        const submission: VisuospatialSubmissionDTO = {
            testId,
            taskId: taskId as VisuospatialTaskId,
            imageBase64: body.imageBase64,
            metadata: body.metadata
        };
        return this.visuospatialService.saveSubmission(submission);
    }

    @Post(':taskId/evaluate')
    async evaluateTask(
        @Param('testId') testId: string,
        @Param('taskId') taskId: string,
        @Body() body: { submissionId: string }
    ) {
        return this.visuospatialService.evaluateSubmission(body.submissionId);
    }

    // Envía la imagen y la evalúa en una sola llamada (sin estado en memoria).
    // Preferido en producción/serverless.
    @Post(':taskId/submit-and-evaluate')
    async submitAndEvaluate(
        @Param('testId') testId: string,
        @Param('taskId') taskId: string,
        @Body() body: { imageBase64: string },
    ) {
        return this.visuospatialService.evaluateImage(taskId as VisuospatialTaskId, body.imageBase64);
    }
}
