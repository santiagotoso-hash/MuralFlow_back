import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { Publico } from '../common/decorators/publico.decorator';
import { AniversariosService } from './aniversarios.service';

/**
 * Disparado pelo Vercel Cron (vercel.json), uma vez por dia às 7h de Brasília.
 * A Vercel manda `Authorization: Bearer <CRON_SECRET>`; sem o segredo certo,
 * 401. Chamar de novo no mesmo dia não reenvia nada.
 */
@ApiExcludeController()
@Controller('cron')
export class AniversariosController {
  constructor(
    private readonly aniversarios: AniversariosService,
    private readonly config: ConfigService,
  ) {}

  @Publico()
  @Get('aniversarios')
  async aniversariosDeHoje(@Headers('authorization') authorization?: string) {
    const segredo = this.config.get<string>('CRON_SECRET');
    if (!segredo) {
      throw new ServiceUnavailableException('CRON_SECRET não configurado');
    }
    const esperado = Buffer.from(`Bearer ${segredo}`);
    const recebido = Buffer.from(authorization ?? '');
    if (
      recebido.length !== esperado.length ||
      !timingSafeEqual(recebido, esperado)
    ) {
      throw new UnauthorizedException();
    }
    return { parabenizados: await this.aniversarios.verificar() };
  }
}
