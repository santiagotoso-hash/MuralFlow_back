import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { Conversa } from '../mensagens/conversa.entity';
import { Mensagem } from '../mensagens/mensagem.entity';
import { AniversariosService } from './aniversarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Aluno, Conversa, Mensagem])],
  providers: [AniversariosService],
})
export class AniversariosModule {}
