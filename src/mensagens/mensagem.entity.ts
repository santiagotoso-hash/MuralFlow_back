import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Conversa } from './conversa.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversa, (c) => c.mensagens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversa_id' })
  conversa: Conversa;

  @ManyToOne(() => Usuario, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'autor_id' })
  autor: Usuario | null;

  @Column({ type: 'text' })
  texto: string;

  /** Enviada pelo sistema em nome da escola (ex.: feliz aniversário); sem autor. */
  @Column({ default: false })
  automatica: boolean;

  @CreateDateColumn({ name: 'enviada_em' })
  enviadaEm: Date;
}
