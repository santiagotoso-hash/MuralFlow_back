import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Papel } from '../common/enums/papel.enum';
import {
  AtualizarPerfilDto,
  AtualizarUsuarioDto,
  CriarUsuarioDto,
} from './dto/usuario.dto';
import { Usuario } from './usuario.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  listar(papel?: Papel) {
    return this.usuarios.find({
      where: papel ? { papel } : {},
      order: { nome: 'ASC' },
    });
  }

  async buscar(id: string) {
    const usuario = await this.usuarios.findOne({
      where: { id },
      relations: { filhos: { turma: true }, turmas: true },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  /**
   * Trava contra deixar a escola sem direção: ninguém tira o próprio acesso
   * de direção, nem desativa/rebaixa a última conta de direção ativa.
   */
  async garantirQueSobraDirecao(
    quemEditaId: string,
    alvoId: string,
    dto: AtualizarUsuarioDto,
  ) {
    const perdeDirecao =
      dto.ativo === false ||
      (dto.papel !== undefined && dto.papel !== Papel.ADMIN);
    if (!perdeDirecao) return;

    if (alvoId === quemEditaId) {
      throw new BadRequestException(
        dto.ativo === false
          ? 'Você não pode desativar a sua própria conta.'
          : 'Você não pode tirar o seu próprio acesso de direção.',
      );
    }
    const alvo = await this.buscar(alvoId);
    if (alvo.papel !== Papel.ADMIN || !alvo.ativo) return;
    const direcaoAtiva = await this.usuarios.countBy({
      papel: Papel.ADMIN,
      ativo: true,
    });
    if (direcaoAtiva <= 1) {
      throw new BadRequestException(
        'Esta é a última conta de direção ativa. Cadastre ou ative outra antes.',
      );
    }
  }

  async criar({ senha, email, ...dados }: CriarUsuarioDto) {
    const emailNormalizado = email.trim().toLowerCase();
    if (await this.usuarios.existsBy({ email: emailNormalizado })) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }
    const usuario = await this.usuarios.save(
      this.usuarios.create({
        ...dados,
        email: emailNormalizado,
        senhaHash: await bcrypt.hash(senha, SALT_ROUNDS),
      }),
    );
    return this.buscar(usuario.id);
  }

  async atualizar(id: string, dto: AtualizarUsuarioDto | AtualizarPerfilDto) {
    const usuario = await this.buscar(id);
    const { senha, ...dados } = dto;

    if ('email' in dados && dados.email) {
      dados.email = dados.email.trim().toLowerCase();
      const outro = await this.usuarios.findOneBy({ email: dados.email });
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
    }

    await this.usuarios.update(usuario.id, {
      ...dados,
      ...(senha ? { senhaHash: await bcrypt.hash(senha, SALT_ROUNDS) } : {}),
    });
    return this.buscar(id);
  }
}
