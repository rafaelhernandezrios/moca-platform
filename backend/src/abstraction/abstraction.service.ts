import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AbstractionSubmissionDTO, AbstractionTaskId } from '@moca/shared';

@Injectable()
export class AbstractionService {
    private openai: OpenAI;

    constructor(private configService: ConfigService) {
        this.openai = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });
    }

    async evaluate(submission: AbstractionSubmissionDTO) {
        const { taskId, data } = submission;
        const prompt = this.getPrompt(taskId);

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-5.4-mini",
                temperature: 0,
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: `Input: "${data.response}"` }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 150,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("Empty OpenAI response");

            return JSON.parse(content);
        } catch (error) {
            console.error("Abstraction Eval Error:", error);
            throw new InternalServerErrorException("Evaluation failed");
        }
    }

    private getPrompt(taskId: AbstractionTaskId): string {
        // Prompt con tolerancia clínica: acepta sinónimos y respuestas en español/inglés
        return `
Rol: MoCA Judge. Criterio clínico razonable (ni muy laxo ni muy estricto). Responde en el idioma del input si aplica.
Task: '${taskId}'.
Criteria (acepta la idea aunque no use la palabra exacta; evalúa la CATEGORÍA de la respuesta, no el término literal):
- ABSTRACTION_TRAIN (Tren-Bicicleta): Score=1 si la respuesta captura la categoría "medio/forma de transporte" o "viajar/trasladarse" (ej: "transporte", "vehículos", "formas de viajar", "medios para moverse", "transportation", "ways to travel"). Score=0 SOLO si la respuesta es puramente concreta/perceptual sin noción de categoría (ej: "ambos tienen ruedas", "son de metal").
- ABSTRACTION_WATCH (Reloj-Regla): Score=1 si la respuesta captura la categoría "instrumentos de medición" (ej: "miden cosas", "sirven para medir", "instrumentos de medida", "measuring tools"). Score=0 SOLO si es puramente concreto sin noción de medir (ej: "tienen números", "son de metal").
Ante duda razonable, si la respuesta se acerca a la categoría correcta aunque esté mal redactada o incompleta, otorga el punto.
Output JSON: { "score": 0|1, "notes": "max 8 words" }
`.trim();
    }
}
