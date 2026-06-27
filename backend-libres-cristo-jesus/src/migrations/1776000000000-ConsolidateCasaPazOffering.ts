import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateCasaPazOffering1776000000000
  implements MigrationInterface
{
  name = 'ConsolidateCasaPazOffering1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "casa_paz_sesion" SET "monto_ofrenda" = COALESCE("monto_ofrenda", 0) + COALESCE("diezmo", 0) WHERE "diezmo" IS NOT NULL AND "diezmo" <> 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" DROP CONSTRAINT IF EXISTS "CHK_casa_paz_sesion_diezmo_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" DROP COLUMN IF EXISTS "diezmo"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" ADD COLUMN IF NOT EXISTS "diezmo" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" ADD CONSTRAINT "CHK_casa_paz_sesion_diezmo_non_negative" CHECK (diezmo >= 0)`,
    );
  }
}
