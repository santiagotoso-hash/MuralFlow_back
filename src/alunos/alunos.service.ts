import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AcessoService } from '../common/acesso/acesso.service';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { Turma } from '../turmas/turma.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Aluno } from './aluno.entity';
import {
  AtualizarAlunoDto,
  AtualizarNascimentoDto,
  AtualizarSaudeDto,
  CriarAlunoDto,
} from './dto/aluno.dto';

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Aluno) private readonly alunos: Repository<Aluno>,
    @InjectRepository(Turma) private readonly turmas: Repository<Turma>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly acesso: AcessoService,
  ) {}

  /** Admin: todos. Professor: alunos das suas turmas. Responsável: filhos. */
  async listar(usuario: UsuarioAutenticado, turmaId?: string) {
    const qb = this.alunos
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.turma', 't')
      .leftJoinAndSelect('a.responsaveis', 'r')
      .orderBy('a.nome', 'ASC');

    if (usuario.papel === Papel.RESPONSAVEL) {
      qb.where(
        'a.id IN (SELECT ar.aluno_id FROM aluno_responsaveis ar WHERE ar.responsavel_id = :uid)',
        { uid: usuario.id },
      );
    } else if (usuario.papel === Papel.PROFESSOR) {
      const ids = await this.acesso.turmaIdsVisiveis(usuario);
      if (!ids?.length) return [];
      qb.where('t.id IN (:...ids)', { ids });
    }
    if (turmaId) qb.andWhere('t.id = :turmaId', { turmaId });

    return qb.getMany();
  }

  buscar(usuario: UsuarioAutenticado, id: string) {
    return this.acesso.garantirAcessoAoAluno(usuario, id);
  }

  async criar(dto: CriarAlunoDto) {
    await this.garantirMatriculaLivre(dto.matricula);
    const aluno = this.alunos.create({
      nome: dto.nome,
      dataNascimento: dto.dataNascimento ?? null,
      matricula: dto.matricula ?? null,
      turma: await this.carregarTurma(dto.turmaId),
      responsaveis: await this.carregarResponsaveis(dto.responsavelIds),
    });
    const salvo = await this.alunos.save(aluno);
    return this.alunos.findOne({
      where: { id: salvo.id },
      relations: { turma: true, responsaveis: true },
    });
  }

  async atualizar(id: string, dto: AtualizarAlunoDto) {
    const aluno = await this.alunos.findOne({
      where: { id },
      relations: { turma: true, responsaveis: true },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    if (dto.matricula !== undefined) {
      await this.garantirMatriculaLivre(dto.matricula, id);
      aluno.matricula = dto.matricula || null;
    }
    if (dto.nome !== undefined) aluno.nome = dto.nome;
    if (dto.dataNascimento !== undefined) {
      aluno.dataNascimento = dto.dataNascimento || null;
    }
    if (dto.turmaId !== undefined) {
      aluno.turma = await this.carregarTurma(dto.turmaId);
    }
    if (dto.responsavelIds !== undefined) {
      aluno.responsaveis = await this.carregarResponsaveis(dto.responsavelIds);
    }
    return this.alunos.save(aluno);
  }

  async atualizarNascimento(
    usuario: UsuarioAutenticado,
    id: string,
    dataNascimento: AtualizarNascimentoDto['dataNascimento'],
  ) {
    const data = dataNascimento.slice(0, 10);
    const hoje = new Date().toISOString().slice(0, 10);
    if (data > hoje || data < '1990-01-01') {
      throw new BadRequestException('Confira a data de nascimento');
    }
    // Já barra o responsável que não é deste aluno.
    const aluno = await this.acesso.garantirAcessoAoAluno(usuario, id);
    await this.alunos.update(aluno.id, { dataNascimento: data });
    return this.acesso.garantirAcessoAoAluno(usuario, id);
  }

  async atualizarSaude(
    usuario: UsuarioAutenticado,
    id: string,
    dto: AtualizarSaudeDto,
  ) {
    // Já barra o responsável que não é deste aluno.
    const aluno = await this.acesso.garantirAcessoAoAluno(usuario, id);
    const texto = (v?: string) =>
      v === undefined ? undefined : v.trim() || null;
    await this.alunos.update(aluno.id, {
      alergias: texto(dto.alergias),
      restricoesAlimentares: texto(dto.restricoesAlimentares),
      medicamentos: texto(dto.medicamentos),
      observacoesSaude: texto(dto.observacoesSaude),
      saudeAtualizadaEm: new Date(),
    });
    return this.acesso.garantirAcessoAoAluno(usuario, id);
  }

  async remover(id: string) {
    const { affected } = await this.alunos.delete(id);
    if (!affected) throw new NotFoundException('Aluno não encontrado');
  }

  private async garantirMatriculaLivre(matricula?: string, alunoId?: string) {
    if (!matricula) return;
    const outro = await this.alunos.findOneBy({ matricula });
    if (outro && outro.id !== alunoId) {
      throw new ConflictException('Já existe um aluno com esta matrícula');
    }
  }

  private async carregarTurma(turmaId?: string) {
    if (!turmaId) return null;
    const turma = await this.turmas.findOneBy({ id: turmaId });
    if (!turma) throw new BadRequestException('Turma não encontrada');
    return turma;
  }

  private async carregarResponsaveis(ids: string[] = []) {
    if (ids.length === 0) return [];
    const responsaveis = await this.usuarios.findBy({
      id: In(ids),
      papel: Papel.RESPONSAVEL,
    });
    if (responsaveis.length !== new Set(ids).size) {
      throw new BadRequestException(
        'Algum dos IDs informados não é de um responsável',
      );
    }
    return responsaveis;
  }
}
