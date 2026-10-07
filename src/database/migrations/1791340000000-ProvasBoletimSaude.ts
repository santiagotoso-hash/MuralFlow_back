import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProvasBoletimSaude1791340000000 implements MigrationInterface {
  name = 'ProvasBoletimSaude1791340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "notas" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "aluno_id" uuid NOT NULL,
                "disciplina" character varying(60) NOT NULL,
                "bimestre" smallint NOT NULL,
                "ano_letivo" integer NOT NULL,
                "valor" numeric(4, 2) NOT NULL,
                "lancada_por_id" uuid,
                "atualizada_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_452745586ebd1e03e9e8bab84e8" UNIQUE (
                    "aluno_id",
                    "disciplina",
                    "bimestre",
                    "ano_letivo"
                ),
                CONSTRAINT "PK_1f3d47f136b291534c128bb4516" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "alergias" text
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "restricoes_alimentares" text
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "medicamentos" text
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "observacoes_saude" text
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos"
            ADD "saude_atualizada_em" TIMESTAMP WITH TIME ZONE
        `);
    await queryRunner.query(`
            ALTER TABLE "eventos"
            ADD "disciplina" character varying(60)
        `);
    await queryRunner.query(`
            ALTER TABLE "notas"
            ADD CONSTRAINT "FK_2818353d06214441d8cbdf15ea1" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "notas"
            ADD CONSTRAINT "FK_2253f9b49d3d7ac6e9b4d319f1e" FOREIGN KEY ("lancada_por_id") REFERENCES "usuarios"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "notas" DROP CONSTRAINT "FK_2253f9b49d3d7ac6e9b4d319f1e"
        `);
    await queryRunner.query(`
            ALTER TABLE "notas" DROP CONSTRAINT "FK_2818353d06214441d8cbdf15ea1"
        `);
    await queryRunner.query(`
            ALTER TABLE "eventos" DROP COLUMN "disciplina"
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "saude_atualizada_em"
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "observacoes_saude"
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "medicamentos"
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "restricoes_alimentares"
        `);
    await queryRunner.query(`
            ALTER TABLE "alunos" DROP COLUMN "alergias"
        `);
    await queryRunner.query(`
            DROP TABLE "notas"
        `);
  }
}
