import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalAdministrativoRole1775500000000 implements MigrationInterface {
  name = 'AddPersonalAdministrativoRole1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."persona_rol_enum" RENAME TO "persona_rol_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."persona_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'PERSONAL_ADMINISTRATIVO', 'INTEGRANTE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum" USING "rol"::"text"::"public"."persona_rol_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."persona_rol_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "persona" SET "rol" = 'INTEGRANTE' WHERE "rol" = 'PERSONAL_ADMINISTRATIVO'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."persona_rol_enum" RENAME TO "persona_rol_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."persona_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'INTEGRANTE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum" USING "rol"::"text"::"public"."persona_rol_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."persona_rol_enum_old"`);
  }
}
