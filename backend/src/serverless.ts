import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// Instancia de Express reutilizada entre invocaciones (evita re-bootstrapear en cada request).
const expressApp = express();
let initialized = false;

async function bootstrap(): Promise<void> {
    if (initialized) return;
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors();
    app.use(json({ limit: '15mb' }));
    app.use(urlencoded({ extended: true, limit: '15mb' }));
    await app.init();
    initialized = true;
}

// Handler para funciones serverless (Vercel). Reenvía la request a la app de Nest/Express.
export default async function handler(req: unknown, res: unknown): Promise<void> {
    await bootstrap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (expressApp as any)(req, res);
}
