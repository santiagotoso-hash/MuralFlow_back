import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { Turma } from '../turmas/turma.entity';
import { BoletimController } from './boletim.controller';
import { BoletimService } from './boletim.service';
import { Nota } from './nota.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nota, Aluno, Turma])],
  controllers: [BoletimController],
  providers: [BoletimService],
})
export class BoletimModule {}
