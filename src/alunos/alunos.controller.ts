import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { AlunosService } from './alunos.service';
import {
  AtualizarAlunoDto,
  AtualizarNascimentoDto,
  AtualizarSaudeDto,
  CriarAlunoDto,
} from './dto/aluno.dto';

@ApiTags('alunos')
@ApiBearerAuth()
@Controller('alunos')
export class AlunosController {
  constructor(private readonly alunos: AlunosService) {}

  @Get()
  @ApiQuery({ name: 'turmaId', required: false })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('turmaId', new ParseUUIDPipe({ optional: true })) turmaId?: string,
  ) {
    return this.alunos.listar(usuario, turmaId);
  }

  @Get(':id')
  buscar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.alunos.buscar(usuario, id);
  }

  @Post()
  @Papeis(Papel.ADMIN)
  criar(@Body() dto: CriarAlunoDto) {
    return this.alunos.criar(dto);
  }

  /** Data de nascimento: direção ou um responsável do aluno. */
  @Patch(':id/nascimento')
  @Papeis(Papel.ADMIN, Papel.RESPONSAVEL)
  atualizarNascimento(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarNascimentoDto,
  ) {
    return this.alunos.atualizarNascimento(usuario, id, dto.dataNascimento);
  }

  /** Ficha de saúde: direção ou um responsável do aluno. */
  @Patch(':id/saude')
  @Papeis(Papel.ADMIN, Papel.RESPONSAVEL)
  atualizarSaude(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarSaudeDto,
  ) {
    return this.alunos.atualizarSaude(usuario, id, dto);
  }

  @Patch(':id')
  @Papeis(Papel.ADMIN)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarAlunoDto,
  ) {
    return this.alunos.atualizar(id, dto);
  }

  @Delete(':id')
  @Papeis(Papel.ADMIN)
  @HttpCode(204)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.alunos.remover(id);
  }
}
