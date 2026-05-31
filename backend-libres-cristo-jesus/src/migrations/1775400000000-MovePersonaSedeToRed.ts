import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovePersonaSedeToRed1775400000000 implements MigrationInterface {
  name = 'MovePersonaSedeToRed1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "red" ADD COLUMN "id_sede" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "red" ADD CONSTRAINT "FK_red_sede" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" DROP CONSTRAINT "FK_persona_sede"`,
    );
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "id_sede"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD COLUMN "id_sede" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ADD CONSTRAINT "FK_persona_sede" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "red" DROP CONSTRAINT "FK_red_sede"`);
    await queryRunner.query(`ALTER TABLE "red" DROP COLUMN "id_sede"`);
  }
}
