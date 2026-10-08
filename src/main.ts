import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('NestBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // La app móvil consume `http://10.0.2.2:3001/api/v1/...`, así que el prefijo
  // global tiene que ser exactamente ese.
  app.setGlobalPrefix('api/v1');

  app.enableCors();

  // Media de ejercicios. Se sirve desde disco en desarrollo; en producción lo
  // ideal es un bucket y que `MEDIA_PUBLIC_URL` apunte ahí.
  const mediaPath = process.env.MEDIA_STORAGE_PATH || './storage/media';
  app.useStaticAssets(mediaPath, { prefix: '/media/' });

  const config = new DocumentBuilder()
    .setTitle('PhysioSense Core API')
    .setDescription(
      'Núcleo de dominio de PhysioSense: pacientes, ejercicios, sesiones, ' +
        'progreso, información clínica y telemetría.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token emitido por authentication-be-microservice. No incluye el ' +
          'rol: se resuelve contra ese servicio por REST (AuthClient).',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Swagger queda fuera del prefijo global, igual que en el microservicio de
  // autenticación: http://localhost:3001/api
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const httpAdapter = app.get(HttpAdapterHost);

  // El filtro va último: tiene que envolver a los errores de la pipe.
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port);

  logger.log(`Listen on port ${port}`);
  logger.log(`Swagger on http://localhost:${port}/api`);
}

bootstrap();
