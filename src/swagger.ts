import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Registers the OpenAPI JSON document at /docs-json.
 * The /docs HTML page is served by SwaggerController (CDN-loaded Swagger UI,
 * avoiding 404s on Nest-served static assets in serverless environments).
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Hangout API')
    .setDescription('The social planning & meetup backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  // Register only the JSON document endpoint — the HTML page is handled by SwaggerController
  SwaggerModule.setup('docs-json', app, doc, {
    swaggerOptions: { persistAuthorization: true },
  });
}