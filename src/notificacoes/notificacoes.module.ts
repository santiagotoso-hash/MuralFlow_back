import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';
import { Usuario } from '../usuarios/usuario.entity';
import { NotificacoesService } from './notificacoes.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [MailService, NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
