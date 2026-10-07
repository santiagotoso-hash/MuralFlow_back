import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { EQUIPE } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { AtualizarProfessorDto } from './dto/professor.dto';
import { ProfessoresService } from './professores.service';

@ApiTags('professores')
@ApiBearerAuth()
@Controller('professores')
@Papeis(...EQUIPE)
export class ProfessoresController {
  constructor(private readonly professores: ProfessoresService) {}

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.professores.listar(usuario);
  }

  /** Direção edita qualquer professor; o professor, só a própria ficha. */
  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarProfessorDto,
  ) {
    return this.professores.atualizar(usuario, id, dto);
  }
}
