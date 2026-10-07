import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlunosModule } from './alunos/alunos.module';
import { AniversariosModule } from './aniversarios/aniversarios.module';
import { AuthModule } from './auth/auth.module';
import { BoletimModule } from './boletim/boletim.module';
import { AcessoModule } from './common/acesso/acesso.module';
import { Publico } from './common/decorators/publico.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PapeisGuard } from './common/guards/papeis.guard';
import { ComunicadosModule } from './comunicados/comunicados.module';
import { envValidationSchema } from './config/env.validation';
import { typeormOptions } from './config/typeorm.options';
import { EventosModule } from './eventos/eventos.module';
import { MensagensModule } from './mensagens/mensagens.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { TurmasModule } from './turmas/turmas.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Controller()
class SaudeController {
  /** Health check para o host (Render/Railway) e para "acordar" a API. */
  @Publico()
  @Get('saude')
  saude() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeormOptions((key) => config.get<string>(key)?.toString()),
    }),
    AcessoModule,
    NotificacoesModule,
    AuthModule,
    UsuariosModule,
    TurmasModule,
    AlunosModule,
    ComunicadosModule,
    EventosModule,
    MensagensModule,
    BoletimModule,
    AniversariosModule,
  ],
  controllers: [SaudeController],
  providers: [
    // Login obrigatório em tudo (exceto @Publico) e checagem de @Papeis.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PapeisGuard },
  ],
})
export class AppModule {}
