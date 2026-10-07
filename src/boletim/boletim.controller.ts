import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { DISCIPLINAS, MEDIA_MINIMA } from '../common/disciplinas';
import { EQUIPE } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { BoletimService } from './boletim.service';
import { FiltroPautaDto, LancarNotasDto } from './dto/nota.dto';

@ApiTags('boletim')
@ApiBearerAuth()
@Controller('boletim')
export class BoletimController {
  constructor(private readonly boletim: BoletimService) {}

  @Get('disciplinas')
  disciplinas() {
    return { disciplinas: DISCIPLINAS, mediaMinima: MEDIA_MINIMA };
  }

  @Get('alunos/:alunoId')
  @ApiQuery({
    name: 'ano',
    required: false,
    description: 'Padrão: ano da turma',
  })
  doAluno(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Query('ano', new ParseIntPipe({ optional: true })) ano?: number,
  ) {
    return this.boletim.doAluno(usuario, alunoId, ano);
  }

  @Get('turmas/:turmaId')
  @Papeis(...EQUIPE)
  pauta(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('turmaId', ParseUUIDPipe) turmaId: string,
    @Query() filtro: FiltroPautaDto,
  ) {
    return this.boletim.pauta(usuario, turmaId, filtro);
  }

  @Put('turmas/:turmaId')
  @Papeis(...EQUIPE)
  lancar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('turmaId', ParseUUIDPipe) turmaId: string,
    @Body() dto: LancarNotasDto,
  ) {
    return this.boletim.lancar(usuario, turmaId, dto);
  }
}
