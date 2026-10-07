import * as pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Turma } from '../turmas/turma.entity';
import { Aluno } from '../alunos/aluno.entity';
import { Comunicado } from '../comunicados/comunicado.entity';
import { CienciaComunicado } from '../comunicados/ciencia-comunicado.entity';
import { Evento } from '../eventos/evento.entity';
import { Conversa } from '../mensagens/conversa.entity';
import { Mensagem } from '../mensagens/mensagem.entity';
import { Nota } from '../boletim/nota.entity';
import { MIGRACOES } from '../database/migrations';

export const ENTIDADES = [
  Usuario,
  Turma,
  Aluno,
  Comunicado,
  CienciaComunicado,
  Evento,
  Conversa,
  Mensagem,
  Nota,
];

type Env = (key: string) => string | undefined;

/** Mesma configuração para a API e para o script de seed. */
export function typeormOptions(env: Env): DataSourceOptions {
  const ssl = env('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false;
  const conexao = env('DATABASE_URL')
    ? { url: env('DATABASE_URL') }
    : {
        host: env('DB_HOST'),
        port: Number(env('DB_PORT') ?? 5432),
        username: env('DB_USERNAME'),
        password: env('DB_PASSWORD'),
        database: env('DB_NAME'),
      };
  const sync = env('DB_SYNC') === 'true';
  return {
    type: 'postgres',
    // Import explícito: o TypeORM carrega o `pg` dinamicamente e o bundler
    // da Vercel o deixava de fora (DriverPackageNotInstalledError).
    driver: pg,
    ...conexao,
    ssl,
    entities: ENTIDADES,
    migrations: MIGRACOES,
    synchronize: sync,
    // Sem DB_SYNC (produção), a API aplica as migrations pendentes ao subir.
    migrationsRun: !sync,
  };
}
