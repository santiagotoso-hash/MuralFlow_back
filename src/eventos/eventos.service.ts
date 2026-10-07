import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcessoService } from '../common/acesso/acesso.service';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { Turma } from '../turmas/turma.entity';
import { CriarEventoDto } from './dto/evento.dto';
import { Evento, TipoEvento } from './evento.entity';

@Injectable()
export class EventosService {
  constructor(
    @InjectRepository(Evento) private readonly eventos: Repository<Evento>,
    @InjectRepository(Turma) private readonly turmas: Repository<Turma>,
    private readonly acesso: AcessoService,
  ) {}

  /** Eventos visíveis, por padrão a partir de hoje. */
  async listar(
    usuario: UsuarioAutenticado,
    de?: string,
    ate?: string,
    tipo?: TipoEvento,
  ) {
    const ids = await this.acesso.turmaIdsVisiveis(usuario);
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const qb = this.eventos
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.turma', 'turma')
      .where('e.inicio >= :de', { de: de ? new Date(de) : inicioDoDia })
      .orderBy('e.inicio', 'ASC');
    if (ate) qb.andWhere('e.inicio <= :ate', { ate: new Date(ate) });
    if (tipo) qb.andWhere('e.tipo = :tipo', { tipo });
    if (ids) {
      qb.andWhere(
        ids.length
          ? '(e.turma_id IS NULL OR e.turma_id IN (:...ids))'
          : 'e.turma_id IS NULL',
        { ids },
      );
    }
    return qb.getMany();
  }

  async criar(usuario: UsuarioAutenticado, dto: CriarEventoDto) {
    if (dto.fim && new Date(dto.fim) < new Date(dto.inicio)) {
      throw new BadRequestException('O término não pode ser antes do início');
    }

    let turma: Turma | null = null;
    if (dto.turmaId) {
      const ids = await this.acesso.turmaIdsVisiveis(usuario);
      if (ids && !ids.includes(dto.turmaId)) {
        throw new ForbiddenException('Você não dá aula nesta turma');
      }
      turma = await this.turmas.findOneBy({ id: dto.turmaId });
      if (!turma) throw new NotFoundException('Turma não encontrada');
    } else if (usuario.papel !== Papel.ADMIN) {
      throw new ForbiddenException(
        'Só a direção cria eventos para a escola inteira. Escolha uma turma.',
      );
    }

    return this.eventos.save(
      this.eventos.create({
        titulo: dto.titulo,
        descricao: dto.descricao ?? null,
        tipo: dto.tipo,
        disciplina:
          dto.tipo === TipoEvento.PROVA ? (dto.disciplina ?? null) : null,
        inicio: new Date(dto.inicio),
        fim: dto.fim ? new Date(dto.fim) : null,
        local: dto.local ?? null,
        turma,
      }),
    );
  }

  async remover(usuario: UsuarioAutenticado, id: string) {
    const evento = await this.eventos.findOneBy({ id });
    if (!evento) throw new NotFoundException('Evento não encontrado');
    if (usuario.papel !== Papel.ADMIN) {
      const ids = await this.acesso.turmaIdsVisiveis(usuario);
      if (!evento.turma || !ids?.includes(evento.turma.id)) {
        throw new ForbiddenException('Você não pode remover este evento');
      }
    }
    await this.eventos.delete(id);
  }
}
