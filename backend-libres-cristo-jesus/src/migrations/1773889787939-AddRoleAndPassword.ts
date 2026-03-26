import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoleAndPassword1773889787939 implements MigrationInterface {
    name = 'AddRoleAndPassword1773889787939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."persona_rol_enum" AS ENUM('ADMIN', 'USUARIO')`);
        await queryRunner.query(`ALTER TABLE "persona" ADD "rol" "public"."persona_rol_enum" NOT NULL DEFAULT 'USUARIO'`);
        await queryRunner.query(`ALTER TABLE "persona" ADD "password" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "rol"`);
        await queryRunner.query(`DROP TYPE "public"."persona_rol_enum"`);
    }

}
