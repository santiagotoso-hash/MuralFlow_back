import { MigrationInterface, QueryRunner } from "typeorm";

export class Aniversarios1791400000000 implements MigrationInterface {
    name = 'Aniversarios1791400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "aniversario_parabenizado_em" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "mensagens"
            ADD "automatica" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "mensagens" DROP COLUMN "automatica"
        `);
        await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "aniversario_parabenizado_em"
        `);
    }

}
