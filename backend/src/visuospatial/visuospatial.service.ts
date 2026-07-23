import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VisuospatialSubmissionDTO, VisuospatialEvalResultDTO, VisuospatialTaskId } from '@moca/shared';
import { randomUUID } from 'node:crypto';

@Injectable()
export class VisuospatialService {
    private openai: OpenAI;
    private submissions: Map<string, VisuospatialSubmissionDTO> = new Map();

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            console.warn('OPENAI_API_KEY not set. Evaluation will fail.');
        }
        this.openai = new OpenAI({ apiKey });
    }

    async saveSubmission(submission: VisuospatialSubmissionDTO): Promise<{ submissionId: string }> {
        const id = randomUUID();
        // In a real app, save to DB
        this.submissions.set(id, submission);
        return { submissionId: id };
    }

    async evaluateSubmission(submissionId: string): Promise<VisuospatialEvalResultDTO> {
        const submission = this.submissions.get(submissionId);
        if (!submission) {
            throw new NotFoundException(`Submission ${submissionId} not found`);
        }
        return this.evaluateImage(submission.taskId, submission.imageBase64);
    }

    // Evalúa directamente a partir de la imagen (sin estado en memoria). Necesario para
    // entornos serverless donde /submissions y /evaluate pueden atender instancias distintas.
    async evaluateImage(taskId: VisuospatialTaskId, imageBase64: string): Promise<VisuospatialEvalResultDTO> {
        const systemPrompt = this.getSystemPrompt(taskId);

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-5.4-mini",
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `Tarea: ${taskId}` },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageBase64,
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 800,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new InternalServerErrorException("Empty response from OpenAI");

            const result = JSON.parse(content) as VisuospatialEvalResultDTO;
            return result;

        } catch (error) {
            console.error("OpenAI Evaluation Error:", error);
            throw new InternalServerErrorException("Failed to evaluate submission");
        }
    }

    private getSystemPrompt(taskId: VisuospatialTaskId): string {
        const BASE_INSTRUCTIONS = `
            Rol: Evaluador MoCA (visuoespacial), con criterio clínico razonable (ni muy laxo ni muy estricto).
            Reglas:
            - Aplica tolerancia clínica normal: imperfecciones de trazo a mano alzada (pulso, temblor, proporciones ligeramente irregulares) NO deben penalizar si la intención y estructura general son correctas.
            - Ante duda razonable entre otorgar o no el punto, favorece otorgarlo si el criterio esencial se cumple, aunque la ejecución no sea perfecta.
            - Solo niega el punto si el criterio esencial claramente falla, no por detalles menores.
            - Garabato/abstracto/ilegible → score=0 y unscorable=false.
            - unscorable=true SOLO si la imagen está completamente en blanco o completamente negra.
            Salida: SOLO JSON válido, exactamente el schema indicado. Notas muy breves.
            `.trim();

        switch (taskId) {
            case "A_TRAIL":
                return `
            ${BASE_INSTRUCTIONS}

            TAREA: Trail Making (Alternancia).
            Objetivo: Conectar en orden 1-A-2-B-3-C-4-D-5-E, alternando número/letra.

            CRITERIOS [A_TRAIL] (max 1):
            - Score=1 si el orden de alternancia 1-A-2-B-3-C-4-D-5-E es correcto, aunque las líneas no sean perfectamente rectas o toquen ligeramente otros puntos al pasar cerca.
            - Score=0 SOLO si hay un error real de secuencia (orden equivocado, un nodo omitido, o una conexión que claramente une los nodos incorrectos).
            - No penalices imprecisión de trazo a mano (líneas curvas, ligera cercanía a otros números/letras) si la intención de conexión es clara.

            OUTPUT SCHEMA (estricto):
            {
            "taskId": "A_TRAIL",
            "unscorable": boolean,
            "score": number,
            "maxScore": 1,
            "confidence": number,
            "checks": {
                "sequenceCorrect": { "pass": boolean, "notes": string }
            },
            "overallNotes": string
            }
            `.trim();

            case "B_CUBE":
                return `
            ${BASE_INSTRUCTIONS}

            TAREA: Copia de Cubo.

            CRITERIOS [B_CUBE] (max 1) — TOLERANCIA CLÍNICA AMPLIA:
            - Debe existir INTENTO CLARO de representar un cubo tridimensional (volumen, no una figura plana).
            - Basta con que se distingan al menos 2-3 caras conectadas sugiriendo profundidad; no exijas perfección geométrica.
            - Se permiten distorsiones de proporción, paralelismo o ángulos, vértices ligeramente desalineados, y líneas dobles o algo tembleque (típico de dibujo a mano) SIEMPRE que el volumen 3D sea reconocible.
            - Score=0 SOLO si:
            - Es claramente una figura plana (cuadrado/rectángulo sin ningún intento de profundidad),
            - Es garabato/líneas caóticas sin relación con un cubo,
            - La estructura está tan desconectada que es imposible reconocer intención de volumen.

            OUTPUT SCHEMA (estricto):
            {
            "taskId": "B_CUBE",
            "unscorable": boolean,
            "score": number,
            "maxScore": 1,
            "confidence": number,
            "checks": {
                "cube3D": { "pass": boolean, "notes": string },
                "cubeLines": { "pass": boolean, "notes": string },
                "cubeParallelism": { "pass": boolean, "notes": string }
            },
            "overallNotes": string
            }
            `.trim();

            case "C_CLOCK":
                return `
            ${BASE_INSTRUCTIONS}

            TAREA: Dibujo de Reloj.

            VERIFICACIÓN DE OBJETO:
            - Si el dibujo NO corresponde a un reloj (p.ej., corazón/cara/espiral/objeto distinto) → score=0 y unscorable=false.
            - unscorable=true SOLO si la imagen está completamente en blanco o negra.

            CRITERIOS [C_CLOCK] (max 3; 1 punto cada uno) — TOLERANCIA CLÍNICA:
            1) Contour (1): Forma circular u ovalada reconocible como contorno, aunque no sea geométricamente perfecta. Se permite un pequeño espacio de cierre (casi cerrado) si es evidente que se intentó cerrar el círculo. Solo 0 si está claramente abierto/incompleto o no es reconocible como círculo.
            2) Numbers (1): Los 12 números presentes, en orden creciente y ubicados razonablemente dentro/sobre el contorno. Acepta espaciado irregular o números algo apretados/grandes, siempre que el orden y la posición aproximada (1 arriba, 6 abajo, etc.) sean correctos. Solo 0 si faltan números, están fuera de orden, o claramente amontonados/ilegibles.
            3) Hands (1): Marcan aproximadamente las 11:10 (tolerancia de algunos minutos/grados en cada manecilla es aceptable).
            - Debe haber dos manecillas de longitud claramente distinta, unidas al centro (o cerca del centro),
            - La más corta (horario) apuntando cerca del 11, la más larga (minutero) cerca del 2.
            - Score=0 SOLO si no se distinguen dos manecillas, no están unidas al centro, o marcan una hora claramente distinta.

            OUTPUT SCHEMA (estricto):
            {
            "taskId": "C_CLOCK",
            "unscorable": boolean,
            "score": number,
            "maxScore": 3,
            "confidence": number,
            "checks": {
                "contour": { "pass": boolean, "notes": string },
                "numbers": { "pass": boolean, "notes": string },
                "hands": { "pass": boolean, "notes": string }
            },
            "overallNotes": string
            }
            `.trim();

            default:
                // Por seguridad: si llega un taskId no soportado, fuerza salida consistente.
                return `
            ${BASE_INSTRUCTIONS}
            TAREA: Desconocida. Devuelve score=0, unscorable=false y explica brevemente "taskId no soportado".
            OUTPUT SCHEMA:
            {
            "taskId": "string",
            "unscorable": boolean,
            "score": number,
            "maxScore": number,
            "confidence": number,
            "checks": {},
            "overallNotes": string
            }
            `.trim();
        }
    }
}

