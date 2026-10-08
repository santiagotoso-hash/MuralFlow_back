import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { AcessoService } from '../common/acesso/acesso.service';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { Usuario } from '../usuarios/usuario.entity';

/** Um aniversário na agenda: só dia e mês (o ano de nascimento não sai). */
export interface AniversarioAgenda {
  /** "aluno:<uuid>" ou "professor:<uuid>". */
  id: string;
  tipo: 'aluno' | 'professor';
  nome: string;
  mes: number;
  dia: number;
  /** Turma do aluno, ou turmas em que o professor dá aula. */
  turmas: string[];
}

/** "2014-03-09" → { mes: 3, dia: 9 } */
const mesEDia = (data: string) => ({
  mes: Number(data.slice(5, 7)),
  dia: Number(data.slice(8, 10)),
});

/**
 * Aniversários que aparecem na agenda de cada um:
 *  - alunos: direção vê todos; professor, os das suas turmas; família, os
 *    colegas das turmas dos filhos;
 *  - professores: direção e professores veem todos; família, os
 *    professores das turmas dos filhos.
 * Não são eventos gravados: saem da data de nascimento, todo ano.
 */
@Injectable()
export class AniversariosAgendaService {
  constructor(
    @InjectRepository(Aluno) private readonly alunos: Repository<Aluno>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly acesso: AcessoService,
  ) {}

  async listar(usuario: UsuarioAutenticado): Promise<AniversarioAgenda[]> {
    const turmaIds = await this.acesso.turmaIdsVisiveis(usuario);
    const [alunos, professores] = await Promise.all([
      this.alunosVisiveis(turmaIds),
      this.professoresVisiveis(usuario, turmaIds),
    ]);
    return [...alunos, ...professores].sort(
      (a, b) => a.mes - b.mes || a.dia - b.dia || a.nome.localeCompare(b.nome),
    );
  }

  private async alunosVisiveis(
    turmaIds: string[] | null,
  ): Promise<AniversarioAgenda[]> {
    if (turmaIds?.length === 0) return [];
    const qb = this.alunos
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.turma', 't')
      .where('a.data_nascimento IS NOT NULL');
    if (turmaIds) qb.andWhere('a.turma_id IN (:...turmaIds)', { turmaIds });
    const alunos = await qb.getMany();
    return alunos.map((a) => ({
      id: `aluno:${a.id}`,
      tipo: 'aluno' as const,
      nome: a.nome,
      ...mesEDia(a.dataNascimento!),
      turmas: a.turma ? [a.turma.nome] : [],
    }));
  }

  private async professoresVisiveis(
    usuario: UsuarioAutenticado,
    turmaIds: string[] | null,
  ): Promise<AniversarioAgenda[]> {
    const familia = usuario.papel === Papel.RESPONSAVEL;
    if (familia && turmaIds?.length === 0) return [];

    const qb = this.usuarios
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.turmas', 't')
      .where('u.papel = :papel', { papel: Papel.PROFESSOR })
      .andWhere('u.ativo = true')
      .andWhere('u.data_nascimento IS NOT NULL');
    if (familia) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM turma_professores tp
                 WHERE tp.professor_id = u.id AND tp.turma_id IN (:...turmaIds))`,
        { turmaIds },
      );
    }
    const professores = await qb.getMany();
    return professores.map((p) => ({
      id: `professor:${p.id}`,
      tipo: 'professor' as const,
      nome: p.nome,
      ...mesEDia(p.dataNascimento!),
      turmas: p.turmas.map((t) => t.nome).sort(),
    }));
  }
}
