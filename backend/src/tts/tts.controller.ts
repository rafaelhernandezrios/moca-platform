import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service';

@Controller('tts')
export class TtsController {
    constructor(private readonly service: TtsService) { }

    @Post()
    async synthesize(@Body('text') text: string, @Res() res: Response) {
        const audio = await this.service.synthesize(text);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audio.length.toString(),
            'Cache-Control': 'no-store',
        });
        res.send(audio);
    }
}
