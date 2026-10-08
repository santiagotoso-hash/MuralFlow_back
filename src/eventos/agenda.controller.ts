import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Publico } from '../common/decorators/publico.decorator';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { AssinaturaAgendaService } from './assinatura-agenda.service';

const ARQUIVO_ICS = /^([A-Za-z0-9_-]{20,64})\.ics$/;

/** Assinatura da agenda no Google Calendar (ou qualquer app de calendário). */
@ApiTags('agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly assinatura: AssinaturaAgendaService) {}

  /** Token do link de assinatura (cria na primeira vez). */
  @ApiBearerAuth()
  @Get('assinatura')
  async token(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return { token: await this.assinatura.token(usuario.id) };
  }

  /** Gera um link novo; o anterior para de funcionar. */
  @ApiBearerAuth()
  @Post('assinatura')
  async novoToken(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return { token: await this.assinatura.novoToken(usuario.id) };
  }

  /**
   * O arquivo .ics em si. Sem login: quem acessa é o Google, e o segredo
   * no nome do arquivo é a autorização.
   */
  @Publico()
  @ApiExcludeEndpoint()
  @Get('ics/:arquivo')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=900')
  ics(@Param('arquivo') arquivo: string) {
    const token = ARQUIVO_ICS.exec(arquivo)?.[1];
    if (!token) throw new NotFoundException('Agenda não encontrada');
    return this.assinatura.ics(token);
  }
}
