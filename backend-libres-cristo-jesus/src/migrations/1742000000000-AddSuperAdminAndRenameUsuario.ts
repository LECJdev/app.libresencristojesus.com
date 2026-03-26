import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuperAdminAndRenameUsuario1742000000000 implements MigrationInterface {
    name = 'AddSuperAdminAndRenameUsuario1742000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new enum values
        await queryRunner.query(`ALTER TYPE "public"."persona_rol_enum" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
        await queryRunner.query(`ALTER TYPE "public"."persona_rol_enum" ADD VALUE IF NOT EXISTS 'INTEGRANTE'`);

        // Migrate existing USUARIO values to INTEGRANTE
        await queryRunner.query(`UPDATE "persona" SET "rol" = 'INTEGRANTE' WHERE "rol" = 'USUARIO'`);

        // Update the default value
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "persona" SET "rol" = 'USUARIO' WHERE "rol" = 'INTEGRANTE'`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'USUARIO'`);
        // Note: PostgreSQL does not support removing enum values easily
    }
}
