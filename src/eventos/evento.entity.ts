import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Turma } from '../turmas/turma.entity';

export enum TipoEvento {
  REUNIAO = 'reuniao',
  PROVA = 'prova',
  PASSEIO = 'passeio',
  FERIADO = 'feriado',
  FESTA = 'festa',
  OUTRO = 'outro',
}

/** Igual a NOME_TIPO_EVENTO do front (lib/formatar.ts). */
export const NOME_TIPO_EVENTO: Record<TipoEvento, string> = {
  [TipoEvento.REUNIAO]: 'Reunião',
  [TipoEvento.PROVA]: 'Prova',
  [TipoEvento.PASSEIO]: 'Passeio',
  [TipoEvento.FERIADO]: 'Feriado',
  [TipoEvento.FESTA]: 'Festa',
  [TipoEvento.OUTRO]: 'Outro',
};

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ type: 'enum', enum: TipoEvento, default: TipoEvento.OUTRO })
  tipo: TipoEvento;

  /** Só para provas: disciplina (ver common/disciplinas.ts). */
  @Column({ type: 'varchar', nullable: true, length: 60 })
  disciplina: string | null;

  @Column({ type: 'timestamptz' })
  inicio: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fim: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 150 })
  local: string | null;

  /** null = evento da escola inteira. */
  @ManyToOne(() => Turma, { nullable: true, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'turma_id' })
  turma: Turma | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
