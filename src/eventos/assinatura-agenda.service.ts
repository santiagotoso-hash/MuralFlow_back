import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { AniversariosAgendaService } from './aniversarios-agenda.service';
import { EventosService } from './eventos.service';
import { gerarIcs } from './ics';

/** Eventos passados que ainda vão no arquivo (o resto é só futuro). */
const DIAS_DE_HISTORICO = 90;

/**
 * Assinatura da agenda: cada usuário tem um link secreto com a sua agenda
 * em .ics, que o Google Calendar (ou Outlook, iPhone) consulta sozinho.
 * O link vê exatamente o que a pessoa vê no app.
 */
@Injectable()
export class AssinaturaAgendaService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly eventos: EventosService,
    private readonly aniversarios: AniversariosAgendaService,
  ) {}

  /** Token atual do usuário; cria um na primeira vez. */
  async token(usuarioId: string) {
    const usuario = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.tokenAgenda')
      .where('u.id = :usuarioId', { usuarioId })
      .getOne();
    return usuario?.tokenAgenda ?? this.novoToken(usuarioId);
  }

  /** Gera outro token: o link antigo para de funcionar. */
  async novoToken(usuarioId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.usuarios.update(usuarioId, { tokenAgenda: token });
    return token;
  }

  async ics(token: string) {
    const usuario = await this.usuarios.findOneBy({
      tokenAgenda: token,
      ativo: true,
    });
    if (!usuario) throw new NotFoundException('Agenda não encontrada');

    const quem = { id: usuario.id, email: usuario.email, papel: usuario.papel };
    const desde = new Date(Date.now() - DIAS_DE_HISTORICO * 86_400_000);
    const [eventos, aniversarios] = await Promise.all([
      this.eventos.listar(quem, desde.toISOString()),
      this.aniversarios.listar(quem),
    ]);
    return gerarIcs('MuralFlow', eventos, aniversarios);
  }
}
