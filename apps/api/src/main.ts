import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './security/cors-origins';
import { applyHttpSecurity } from './security/http-security';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  applyHttpSecurity(app);
  app.enableCors({
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGINS')),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret', 'Idempotency-Key'],
    credentials: true,
  });
  // Cloud Run injects PORT; bind all interfaces so the GFE can reach the container.
  const port = Number(process.env.PORT ?? config.get<number>('PORT') ?? 8080);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
