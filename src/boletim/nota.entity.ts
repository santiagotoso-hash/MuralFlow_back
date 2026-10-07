import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { Usuario } from '../usuarios/usuario.entity';

/**
 * Nota de UM aluno em UMA disciplina num bimestre. O boletim é o conjunto
 * das notas do aluno no ano letivo (o da turma em que a nota foi lançada).
 */
@Entity('notas')
@Unique(['alunoId', 'disciplina', 'bimestre', 'anoLetivo'])
export class Nota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aluno_id', type: 'uuid' })
  alunoId: string;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ length: 60 })
  disciplina: string;

  /** 1 a 4. */
  @Column({ type: 'smallint' })
  bimestre: number;

  @Column({ name: 'ano_letivo', type: 'int' })
  anoLetivo: number;

  /** 0 a 10, com até duas casas (o Postgres devolve numeric como string). */
  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  valor: number;

  @Column({ name: 'lancada_por_id', type: 'uuid', nullable: true })
  lancadaPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lancada_por_id' })
  lancadaPor: Usuario | null;

  @UpdateDateColumn({ name: 'atualizada_em', type: 'timestamptz' })
  atualizadaEm: Date;
}
