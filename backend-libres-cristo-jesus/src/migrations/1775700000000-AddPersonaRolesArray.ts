import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaRolesArray1775700000000 implements MigrationInterface {
  name = 'AddPersonaRolesArray1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD "roles" "public"."persona_rol_enum" array NOT NULL DEFAULT ARRAY['INTEGRANTE']::"public"."persona_rol_enum"[]`,
    );
    await queryRunner.query(
      `UPDATE "persona" SET "roles" = ARRAY[rol]::"public"."persona_rol_enum"[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "roles"`);
  }
}
