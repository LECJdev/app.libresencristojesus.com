import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCasaDePazLeaderRole1775800000000 implements MigrationInterface {
  name = 'AddCasaDePazLeaderRole1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."persona_rol_enum" RENAME TO "persona_rol_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."persona_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'PERSONAL_ADMINISTRATIVO', 'LIDER_CASA_DE_PAZ', 'INTEGRANTE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum" USING "rol"::"text"::"public"."persona_rol_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" TYPE "public"."persona_rol_enum"[] USING ("roles"::text[]::"public"."persona_rol_enum"[])`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" SET DEFAULT ARRAY['INTEGRANTE']::"public"."persona_rol_enum"[]`,
    );
    await queryRunner.query(`DROP TYPE "public"."persona_rol_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "persona" SET "rol" = 'INTEGRANTE' WHERE "rol" = 'LIDER_CASA_DE_PAZ'`,
    );
    await queryRunner.query(
      `UPDATE "persona" SET "roles" = CASE WHEN cardinality(array_remove("roles", 'LIDER_CASA_DE_PAZ'::"public"."persona_rol_enum")) = 0 THEN ARRAY['INTEGRANTE']::"public"."persona_rol_enum"[] ELSE array_remove("roles", 'LIDER_CASA_DE_PAZ'::"public"."persona_rol_enum") END`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."persona_rol_enum" RENAME TO "persona_rol_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."persona_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'PERSONAL_ADMINISTRATIVO', 'INTEGRANTE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum" USING "rol"::"text"::"public"."persona_rol_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" TYPE "public"."persona_rol_enum"[] USING ("roles"::text[]::"public"."persona_rol_enum"[])`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "roles" SET DEFAULT ARRAY['INTEGRANTE']::"public"."persona_rol_enum"[]`,
    );
    await queryRunner.query(`DROP TYPE "public"."persona_rol_enum_old"`);
  }
}
