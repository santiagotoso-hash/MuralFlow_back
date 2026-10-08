import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { Turma } from '../turmas/turma.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { AgendaController } from './agenda.controller';
import { AniversariosAgendaService } from './aniversarios-agenda.service';
import { AssinaturaAgendaService } from './assinatura-agenda.service';
import { Evento } from './evento.entity';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evento, Turma, Aluno, Usuario])],
  controllers: [EventosController, AgendaController],
  providers: [
    EventosService,
    AniversariosAgendaService,
    AssinaturaAgendaService,
  ],
})
export class EventosModule {}
