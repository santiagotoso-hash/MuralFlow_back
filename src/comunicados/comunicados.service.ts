import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcessoService } from '../common/acesso/acesso.service';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { Turma } from '../turmas/turma.entity';
import { CienciaComunicado } from './ciencia-comunicado.entity';
import { Comunicado } from './comunicado.entity';
import { CriarComunicadoDto } from './dto/comunicado.dto';

export interface ComunicadoComStatus extends Comunicado {
  /** Responsável: se já confirmou ciência. */
  ciente?: boolean;
  /** Equipe: quantos responsáveis confirmaram / quantos deveriam. */
  totalCiencias?: number;
  totalDestinatarios?: number;
}

@Injectable()
export class ComunicadosService {
  constructor(
    @InjectRepository(Comunicado)
    private readonly comunicados: Repository<Comunicado>,
    @InjectRepository(CienciaComunicado)
    private readonly ciencias: Repository<CienciaComunicado>,
    @InjectRepository(Turma) private readonly turmas: Repository<Turma>,
    private readonly acesso: AcessoService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /** Comunicados da escola inteira + os das turmas visíveis ao usuário. */
  async listar(usuario: UsuarioAutenticado): Promise<ComunicadoComStatus[]> {
    const ids = await this.acesso.turmaIdsVisiveis(usuario);
    const qb = this.comunicados
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.autor', 'autor')
      .leftJoinAndSelect('c.turma', 'turma')
      .orderBy('c.publicadoEm', 'DESC');
    if (ids) {
      qb.where(
        ids.length
          ? '(c.turma_id IS NULL OR c.turma_id IN (:...ids))'
          : 'c.turma_id IS NULL',
        { ids },
      );
    }
    const lista: ComunicadoComStatus[] = await qb.getMany();

    if (usuario.papel === Papel.RESPONSAVEL) {
      const confirmados = await this.ciencias
        .createQueryBuilder('ci')
        .select('ci.comunicado_id', 'id')
        .where('ci.usuario_id = :uid', { uid: usuario.id })
        .getRawMany<{ id: string }>();
      const set = new Set(confirmados.map((c) => c.id));
      lista.forEach((c) => (c.ciente = set.has(c.id)));
    } else {
      await this.preencherContagens(lista.filter((c) => c.exigeCiencia));
    }
    return lista;
  }

  async criar(usuario: UsuarioAutenticado, dto: CriarComunicadoDto) {
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
        'Só a direção publica comunicados para a escola inteira. Escolha uma turma.',
      );
    }

    const { id } = await this.comunicados.save(
      this.comunicados.create({
        titulo: dto.titulo,
        conteudo: dto.conteudo,
        categoria: dto.categoria,
        exigeCiencia: dto.exigeCiencia ?? false,
        autor: { id: usuario.id },
        turma,
      }),
    );
    // Recarrega para ter autor e turma completos (relações eager).
    const comunicado = await this.comunicados.findOneByOrFail({ id });
    void this.notificacoes.comunicadoPublicado(comunicado);
    return comunicado;
  }

  async confirmarCiencia(usuario: UsuarioAutenticado, id: string) {
    const comunicado = await this.buscarVisivel(usuario, id);
    await this.ciencias
      .createQueryBuilder()
      .insert()
      .values({
        comunicado: { id: comunicado.id },
        usuario: { id: usuario.id },
      })
      .orIgnore()
      .execute();
    return { ciente: true };
  }

  async remover(usuario: UsuarioAutenticado, id: string) {
    const comunicado = await this.comunicados.findOneBy({ id });
    if (!comunicado) throw new NotFoundException('Comunicado não encontrado');
    if (usuario.papel !== Papel.ADMIN && comunicado.autor?.id !== usuario.id) {
      throw new ForbiddenException('Só o autor ou a direção podem remover');
    }
    await this.comunicados.delete(id);
  }

  private async buscarVisivel(usuario: UsuarioAutenticado, id: string) {
    const comunicado = await this.comunicados.findOneBy({ id });
    const ids = await this.acesso.turmaIdsVisiveis(usuario);
    const visivel =
      comunicado &&
      (!ids || !comunicado.turma || ids.includes(comunicado.turma.id));
    if (!visivel) throw new NotFoundException('Comunicado não encontrado');
    return comunicado;
  }

  /**
   * Destinatários = responsáveis ativos com filho na turma do comunicado
   * (ou, se for para a escola inteira, com qualquer filho matriculado).
   */
  private async preencherContagens(lista: ComunicadoComStatus[]) {
    if (lista.length === 0) return;
    const ids = lista.map((c) => c.id);

    const ciencias = await this.ciencias
      .createQueryBuilder('ci')
      .select('ci.comunicado_id', 'id')
      .addSelect('COUNT(*)::int', 'total')
      .where('ci.comunicado_id IN (:...ids)', { ids })
      .groupBy('ci.comunicado_id')
      .getRawMany<{ id: string; total: number }>();

    const porTurma = await this.comunicados.manager
      .createQueryBuilder()
      .select('a.turma_id', 'turmaId')
      .addSelect('COUNT(DISTINCT ar.responsavel_id)::int', 'total')
      .from('aluno_responsaveis', 'ar')
      .innerJoin('alunos', 'a', 'a.id = ar.aluno_id')
      .groupBy('a.turma_id')
      .getRawMany<{ turmaId: string | null; total: number }>();

    const [{ total: escolaToda }] = await this.comunicados.manager
      .createQueryBuilder()
      .select('COUNT(DISTINCT ar.responsavel_id)::int', 'total')
      .from('aluno_responsaveis', 'ar')
      .getRawMany<{ total: number }>();

    const cienciasMap = new Map(ciencias.map((c) => [c.id, c.total]));
    const turmaMap = new Map(porTurma.map((t) => [t.turmaId, t.total]));
    for (const c of lista) {
      c.totalCiencias = cienciasMap.get(c.id) ?? 0;
      c.totalDestinatarios = c.turma
        ? (turmaMap.get(c.turma.id) ?? 0)
        : escolaToda;
    }
  }
}
