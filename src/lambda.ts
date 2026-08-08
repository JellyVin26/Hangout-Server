import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalAuthGuard } from './common/global-auth.guard';

let cachedApp: INestApplication | null = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  const instance = express();
  const adapter = new ExpressAdapter(instance);
  const app = await NestFactory.create(AppModule, adapter, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new GlobalAuthGuard(app.get(Reflector)));

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Hangout API')
    .setDescription('The social planning & meetup backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await createApp();
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance(req, res);
}
