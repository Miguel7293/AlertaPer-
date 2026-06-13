import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable Nest's default body parser so we can raise the limit for base64 face images.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const origin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`SEGURO API running on http://localhost:${port} (in-memory store, no DB)`);
}
bootstrap();
