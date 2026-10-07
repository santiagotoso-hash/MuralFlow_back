import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get('NODE_ENV') === 'production';

  // A CSP padrão do helmet quebra a UI do Swagger; fora de produção, desligada.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // FRONTEND_URL aceita vários domínios separados por vírgula.
  app.enableCors({
    origin: String(config.get('FRONTEND_URL'))
      .split(',')
      .map((url) => url.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Respeita @Exclude() (ex.: nunca devolver senhaHash).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  if (!isProduction) {
    const doc = new DocumentBuilder()
      .setTitle('MuralFlow API')
      .setDescription('Comunicação entre escola e famílias')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get<number>('PORT') ?? 4001;
  await app.listen(port);
  new Logger('Bootstrap').log(
    `API em http://localhost:${port}${isProduction ? '' : ' · Swagger em /api'}`,
  );
}
void bootstrap();
