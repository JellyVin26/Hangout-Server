import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalAuthGuard } from './common/global-auth.guard';
import { setupSwagger } from './swagger';

let cachedApp: INestApplication | null = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  const instance = express();
  const adapter = new ExpressAdapter(instance);
  const app = await NestFactory.create(AppModule, adapter, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new GlobalAuthGuard(app.get(Reflector)));
  setupSwagger(app);

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await createApp();
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance(req, res);
}