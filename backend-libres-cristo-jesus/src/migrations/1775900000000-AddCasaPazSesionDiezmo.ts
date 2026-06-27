import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCasaPazSesionDiezmo1775900000000 implements MigrationInterface {
  name = 'AddCasaPazSesionDiezmo1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" ADD "diezmo" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" ADD CONSTRAINT "CHK_casa_paz_sesion_diezmo_non_negative" CHECK (diezmo >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" DROP CONSTRAINT "CHK_casa_paz_sesion_diezmo_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" DROP COLUMN "diezmo"`,
    );
  }
}
