import { MigrationInterface, QueryRunner } from "typeorm";

export class FichaProfessor1791500000000 implements MigrationInterface {
    name = 'FichaProfessor1791500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "usuarios"
            ADD "data_nascimento" date
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios"
            ADD "endereco" text
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios"
            ADD "alergias" text
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios"
            ADD "anotacoes" text
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "usuarios" DROP COLUMN "anotacoes"
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios" DROP COLUMN "alergias"
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios" DROP COLUMN "endereco"
        `);
        await queryRunner.query(`
            ALTER TABLE "usuarios" DROP COLUMN "data_nascimento"
        `);
    }

}
