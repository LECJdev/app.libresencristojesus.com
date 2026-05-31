import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSedeToPersona1775300000000 implements MigrationInterface {
  name = 'AddSedeToPersona1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD COLUMN "id_sede" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ADD CONSTRAINT "FK_persona_sede" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" DROP CONSTRAINT "FK_persona_sede"`,
    );
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "id_sede"`);
  }
}
