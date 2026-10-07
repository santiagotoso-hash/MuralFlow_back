import { MigrationInterface, QueryRunner } from 'typeorm';

/** Preferência de avisos por e-mail. IF NOT EXISTS: pode já ter sido criada à mão. */
export class ReceberEmails1791330000000 implements MigrationInterface {
  name = 'ReceberEmails1791330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "receber_emails" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN "receber_emails"`,
    );
  }
}
