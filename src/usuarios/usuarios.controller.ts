import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { EQUIPE, Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import {
  AtualizarPerfilDto,
  AtualizarUsuarioDto,
  CriarUsuarioDto,
} from './dto/usuario.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Perfil de quem está logado, com filhos (responsável) ou turmas (professor). */
  @Get('eu')
  eu(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.usuarios.buscar(usuario.id);
  }

  @Patch('eu')
  atualizarPerfil(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarPerfilDto,
  ) {
    return this.usuarios.atualizar(usuario.id, dto);
  }

  /** A equipe precisa listar responsáveis/professores para vincular. */
  @Get()
  @Papeis(...EQUIPE)
  @ApiQuery({ name: 'papel', enum: Papel, required: false })
  listar(
    @Query('papel', new ParseEnumPipe(Papel, { optional: true }))
    papel?: Papel,
  ) {
    return this.usuarios.listar(papel);
  }

  @Post()
  @Papeis(Papel.ADMIN)
  criar(@Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(dto);
  }

  @Patch(':id')
  @Papeis(Papel.ADMIN)
  async atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarUsuarioDto,
  ) {
    await this.usuarios.garantirQueSobraDirecao(usuario.id, id, dto);
    return this.usuarios.atualizar(id, dto);
  }
}
