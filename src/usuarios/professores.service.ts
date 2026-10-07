import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Papel } from '../common/enums/papel.enum';
import type { UsuarioAutenticado } from '../common/usuario-autenticado';
import { AtualizarProfessorDto } from './dto/professor.dto';
import { Usuario } from './usuario.entity';

/**
 * Quem vê o quê na área Professores:
 *  - Direção: tudo, inclusive anotações; vê também os desativados.
 *  - Professor: dos colegas, só contato e turmas; a própria ficha completa
 *    (menos as anotações da direção).
 */
@Injectable()
export class ProfessoresService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  async listar(quem: UsuarioAutenticado) {
    const admin = quem.papel === Papel.ADMIN;
    const qb = this.consulta(admin)
      .orderBy('u.nome', 'ASC')
      .addOrderBy('t.nome', 'ASC');
    if (!admin) qb.andWhere('u.ativo = true');
    const lista = await qb.getMany();
    return admin ? lista : lista.map((p) => this.paraColega(p, quem));
  }

  async atualizar(
    quem: UsuarioAutenticado,
    id: string,
    dto: AtualizarProfessorDto,
  ) {
    const admin = quem.papel === Papel.ADMIN;
    if (!admin) {
      if (id !== quem.id) {
        throw new ForbiddenException(
          'Você só pode editar os seus próprios dados',
        );
      }
      if (dto.email !== undefined || dto.anotacoes !== undefined) {
        throw new ForbiddenException('E-mail e anotações só a direção altera');
      }
    }
    const alvo = await this.usuarios.findOneBy({ id, papel: Papel.PROFESSOR });
    if (!alvo) throw new NotFoundException('Professor não encontrado');

    const texto = (v?: string) =>
      v === undefined ? undefined : v.trim() || null;
    const dados: Partial<Usuario> = {
      nome: dto.nome?.trim(),
      telefone: texto(dto.telefone),
      endereco: texto(dto.endereco),
      alergias: texto(dto.alergias),
      anotacoes: texto(dto.anotacoes),
      dataNascimento: this.data(dto.dataNascimento),
    };
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const outro = await this.usuarios.findOneBy({ email });
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      dados.email = email;
    }
    // Só muda o que veio no corpo (update() ignora as chaves undefined).
    if (Object.values(dados).some((v) => v !== undefined)) {
      await this.usuarios.update(id, dados);
    }

    const atualizado = await this.consulta(admin)
      .andWhere('u.id = :id', { id })
      .getOneOrFail();
    return admin ? atualizado : this.paraColega(atualizado, quem);
  }

  private consulta(comAnotacoes: boolean) {
    return this.usuarios
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.turmas', 't')
      .addSelect([
        'u.endereco',
        'u.alergias',
        ...(comAnotacoes ? ['u.anotacoes'] : []),
      ])
      .where('u.papel = :papel', { papel: Papel.PROFESSOR });
  }

  /** Professor vendo a lista: dados pessoais só os dele. */
  private paraColega(p: Usuario, quem: UsuarioAutenticado) {
    if (p.id === quem.id) return p;
    // undefined some do JSON.
    return {
      ...p,
      endereco: undefined,
      alergias: undefined,
      dataNascimento: undefined,
    };
  }

  /** "" apaga; senão AAAA-MM-DD válida, não futura. */
  private data(valor?: string) {
    if (valor === undefined) return undefined;
    if (valor === '') return null;
    const hoje = new Date().toISOString().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
      Number.isNaN(Date.parse(valor)) ||
      valor > hoje ||
      valor < '1930-01-01'
    ) {
      throw new BadRequestException('Confira a data de nascimento');
    }
    return valor;
  }
}
