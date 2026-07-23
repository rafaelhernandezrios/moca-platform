import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TtsService {
    private readonly apiKey?: string;
    private readonly voiceId: string;
    private readonly model: string;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
        // Voz por defecto (puede sobreescribirse por env).
        this.voiceId = this.configService.get<string>('ELEVENLABS_VOICE_ID') || 'mCohq6Jd8tHED7raDPLa';
        // Modelo multilingüe (lee español de forma consistente).
        this.model = this.configService.get<string>('ELEVENLABS_MODEL') || 'eleven_multilingual_v2';
    }

    async synthesize(text: string): Promise<Buffer> {
        if (!text || !text.trim()) {
            throw new BadRequestException('Texto vacío.');
        }
        if (!this.apiKey) {
            throw new InternalServerErrorException('ELEVENLABS_API_KEY no configurada.');
        }

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    Accept: 'audio/mpeg',
                },
                body: JSON.stringify({
                    text,
                    model_id: this.model,
                    // `language_code` solo lo soportan los modelos v2.5 (turbo/flash). En esos
                    // fuerza el idioma; en multilingual_v2 el español se garantiza porque TODO
                    // el texto que enviamos está en español.
                    ...(this.model.includes('v2_5') ? { language_code: 'es' } : {}),
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            });

            if (!resp.ok) {
                const detail = await resp.text().catch(() => '');
                console.error('ElevenLabs error', resp.status, detail);
                throw new InternalServerErrorException(`ElevenLabs respondió ${resp.status}`);
            }

            const arrayBuffer = await resp.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (err) {
            if (err instanceof InternalServerErrorException) throw err;
            console.error('TTS error', err);
            throw new InternalServerErrorException('No se pudo generar el audio.');
        }
    }
}
