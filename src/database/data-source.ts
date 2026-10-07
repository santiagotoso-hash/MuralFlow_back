/**
 * DataSource usado pela CLI do TypeORM (migrations) e pelo seed.
 * A API usa a mesma configuração via `typeormOptions`.
 *
 *   npm run migration:generate --nome=AdicionaCampoX
 *   npm run migration:run
 *
 * Lê o `.env` (ou o arquivo em DOTENV_CONFIG_PATH). Ao gerar uma migration,
 * adicione-a em `migrations/index.ts`.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { typeormOptions } from '../config/typeorm.options';

export default new DataSource({
  ...typeormOptions((k) => process.env[k]),
  // O esquema só muda por migration, nunca por sincronização.
  synchronize: false,
  migrationsRun: false,
  migrationsTransactionMode: 'all',
});
