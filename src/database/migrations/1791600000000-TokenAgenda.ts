import { MigrationInterface, QueryRunner } from 'typeorm';

/** Segredo do link de assinatura da agenda (.ics, Google Calendar). */
export class TokenAgenda1791600000000 implements MigrationInterface {
  name = 'TokenAgenda1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD "token_agenda" character varying(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD CONSTRAINT "UQ_2d191d35a73ccbd8f3c145df0d3" UNIQUE ("token_agenda")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_2d191d35a73ccbd8f3c145df0d3"
    `);
    await queryRunner.query(`
      ALTER TABLE "usuarios" DROP COLUMN "token_agenda"
    `);
  }
}
