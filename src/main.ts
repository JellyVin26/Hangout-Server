import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalAuthGuard } from './common/global-auth.guard';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new GlobalAuthGuard(app.get(Reflector)));
  setupSwagger(app);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`🚀 Hangout API on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();