import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Drawing submissions (canvas PNGs as base64, especially ones with a baked-in
  // reference image at devicePixelRatio resolution) can comfortably exceed the
  // default 100kb Express/Nest body limit. Raise it so those requests don't get
  // rejected before reaching the controller.
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
