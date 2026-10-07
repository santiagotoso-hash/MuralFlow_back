import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Turma } from '../turmas/turma.entity';

@Entity('alunos')
export class Aluno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nome: string;

  @Column({ name: 'data_nascimento', type: 'date', nullable: true })
  dataNascimento: string | null;

  /** Número de matrícula da secretaria. */
  @Column({ type: 'varchar', nullable: true, unique: true, length: 30 })
  matricula: string | null;

  // ── Ficha de saúde: preenchida pela família ou pela secretaria; ──
  // ── os professores da turma só leem.                             ──

  /** Ex.: "Amendoim, camarão". Vazio = sem alergias conhecidas. */
  @Column({ type: 'text', nullable: true })
  alergias: string | null;

  /** Ex.: "Intolerância à lactose", "vegetariano". */
  @Column({ name: 'restricoes_alimentares', type: 'text', nullable: true })
  restricoesAlimentares: string | null;

  /** Medicamentos de uso contínuo ou de emergência (ex.: bombinha). */
  @Column({ type: 'text', nullable: true })
  medicamentos: string | null;

  @Column({ name: 'observacoes_saude', type: 'text', nullable: true })
  observacoesSaude: string | null;

  @Column({ name: 'saude_atualizada_em', type: 'timestamptz', nullable: true })
  saudeAtualizadaEm: Date | null;

  /** Ano do último "feliz aniversário" enviado (evita mandar duas vezes). */
  @Column({
    name: 'aniversario_parabenizado_em',
    type: 'int',
    nullable: true,
    select: false,
  })
  aniversarioParabenizadoEm: number | null;

  @ManyToOne(() => Turma, (turma) => turma.alunos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'turma_id' })
  turma: Turma | null;

  @ManyToMany(() => Usuario, (usuario) => usuario.filhos)
  @JoinTable({
    name: 'aluno_responsaveis',
    joinColumn: { name: 'aluno_id' },
    inverseJoinColumn: { name: 'responsavel_id' },
  })
  responsaveis: Usuario[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
