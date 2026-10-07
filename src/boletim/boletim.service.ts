import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { AcessoService } from '../common/acesso/acesso.service';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { Turma } from '../turmas/turma.entity';
import { FiltroPautaDto, LancarNotasDto } from './dto/nota.dto';
import { Nota } from './nota.entity';

@Injectable()
export class BoletimService {
  constructor(
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
    @InjectRepository(Aluno) private readonly alunos: Repository<Aluno>,
    @InjectRepository(Turma) private readonly turmas: Repository<Turma>,
    private readonly acesso: AcessoService,
  ) {}

  /** Boletim de um aluno: todas as notas do ano letivo. */
  async doAluno(usuario: UsuarioAutenticado, alunoId: string, ano?: number) {
    const aluno = await this.acesso.garantirAcessoAoAluno(usuario, alunoId);
    const anoLetivo = ano ?? aluno.turma?.anoLetivo ?? new Date().getFullYear();
    const notas = await this.notas.find({
      where: { alunoId, anoLetivo },
      order: { disciplina: 'ASC', bimestre: 'ASC' },
    });
    return {
      aluno: { id: aluno.id, nome: aluno.nome, turma: aluno.turma },
      anoLetivo,
      notas: notas.map(({ disciplina, bimestre, valor }) => ({
        disciplina,
        bimestre,
        valor,
      })),
    };
  }

  /** Pauta: os alunos da turma com a nota de uma disciplina num bimestre. */
  async pauta(
    usuario: UsuarioAutenticado,
    turmaId: string,
    { disciplina, bimestre }: FiltroPautaDto,
  ) {
    const turma = await this.turmaVisivel(usuario, turmaId);
    const alunos = await this.alunos.find({
      where: { turma: { id: turma.id } },
      order: { nome: 'ASC' },
    });
    const notas = alunos.length
      ? await this.notas.findBy({
          alunoId: In(alunos.map((a) => a.id)),
          disciplina,
          bimestre,
          anoLetivo: turma.anoLetivo,
        })
      : [];
    const porAluno = new Map(notas.map((n) => [n.alunoId, n.valor]));
    return {
      turma: { id: turma.id, nome: turma.nome, anoLetivo: turma.anoLetivo },
      disciplina,
      bimestre,
      alunos: alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        valor: porAluno.get(a.id) ?? null,
      })),
    };
  }

  /** Salva a pauta inteira: valor = nota nova/alterada; null = apaga. */
  async lancar(
    usuario: UsuarioAutenticado,
    turmaId: string,
    dto: LancarNotasDto,
  ) {
    const turma = await this.turmaVisivel(usuario, turmaId);
    const daTurma = new Set(
      (
        await this.alunos.find({
          where: { turma: { id: turma.id } },
          select: { id: true },
        })
      ).map((a) => a.id),
    );
    if (dto.notas.some((n) => !daTurma.has(n.alunoId))) {
      throw new BadRequestException('Algum aluno não é desta turma');
    }

    const chave = {
      disciplina: dto.disciplina,
      bimestre: dto.bimestre,
      anoLetivo: turma.anoLetivo,
    };
    const salvar = dto.notas.filter((n) => n.valor !== null);
    const apagar = dto.notas
      .filter((n) => n.valor === null)
      .map((n) => n.alunoId);

    await this.notas.manager.transaction(async (m) => {
      if (salvar.length) {
        await m.getRepository(Nota).upsert(
          salvar.map((n) => ({
            ...chave,
            alunoId: n.alunoId,
            valor: n.valor!,
            lancadaPorId: usuario.id,
          })),
          ['alunoId', 'disciplina', 'bimestre', 'anoLetivo'],
        );
      }
      if (apagar.length) {
        await m.getRepository(Nota).delete({ ...chave, alunoId: In(apagar) });
      }
    });
    return this.pauta(usuario, turmaId, dto);
  }

  private async turmaVisivel(usuario: UsuarioAutenticado, turmaId: string) {
    const ids = await this.acesso.turmaIdsVisiveis(usuario);
    const turma =
      !ids || ids.includes(turmaId)
        ? await this.turmas.findOneBy({ id: turmaId })
        : null;
    if (!turma) throw new NotFoundException('Turma não encontrada');
    return turma;
  }
}
