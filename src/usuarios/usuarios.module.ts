import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessoresController } from './professores.controller';
import { ProfessoresService } from './professores.service';
import { Usuario } from './usuario.entity';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsuariosController, ProfessoresController],
  providers: [UsuariosService, ProfessoresService],
})
export class UsuariosModule {}
