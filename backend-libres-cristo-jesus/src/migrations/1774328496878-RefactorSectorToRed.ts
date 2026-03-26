import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorSectorToRed1774328496878 implements MigrationInterface {
    name = 'RefactorSectorToRed1774328496878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dicipulado" DROP CONSTRAINT "FK_dc1aa3bc35f1308b415df743707"`);
        await queryRunner.query(`ALTER TABLE "distrito" DROP CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4"`);
        await queryRunner.query(`ALTER TABLE "sector" RENAME TO "red"`);
        await queryRunner.query(`ALTER TABLE "persona" ADD "barrio" character varying(150)`);
        await queryRunner.query(`ALTER TABLE "persona" ADD "red_id" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "persona" ADD "invitado_por_id" character varying(50)`);
        await queryRunner.query(`ALTER TYPE "public"."persona_rol_enum" RENAME TO "persona_rol_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."persona_rol_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'INTEGRANTE')`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum" USING "rol"::"text"::"public"."persona_rol_enum"`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`);
        await queryRunner.query(`DROP TYPE "public"."persona_rol_enum_old"`);
        await queryRunner.query(`ALTER TABLE "persona" ADD CONSTRAINT "FK_537a05e57c174ce590d6c802886" FOREIGN KEY ("red_id") REFERENCES "red"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "persona" ADD CONSTRAINT "FK_15bf0cb268bf4f00bd9adae5dc5" FOREIGN KEY ("invitado_por_id") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dicipulado" ADD CONSTRAINT "FK_dc1aa3bc35f1308b415df743707" FOREIGN KEY ("id_sector") REFERENCES "red"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "distrito" ADD CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4" FOREIGN KEY ("id_sector") REFERENCES "red"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "distrito" DROP CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4"`);
        await queryRunner.query(`ALTER TABLE "dicipulado" DROP CONSTRAINT "FK_dc1aa3bc35f1308b415df743707"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP CONSTRAINT "FK_15bf0cb268bf4f00bd9adae5dc5"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP CONSTRAINT "FK_537a05e57c174ce590d6c802886"`);
        await queryRunner.query(`CREATE TYPE "public"."persona_rol_enum_old" AS ENUM('ADMIN', 'USUARIO', 'SUPER_ADMIN', 'INTEGRANTE')`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" TYPE "public"."persona_rol_enum_old" USING "rol"::"text"::"public"."persona_rol_enum_old"`);
        await queryRunner.query(`ALTER TABLE "persona" ALTER COLUMN "rol" SET DEFAULT 'INTEGRANTE'`);
        await queryRunner.query(`DROP TYPE "public"."persona_rol_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."persona_rol_enum_old" RENAME TO "persona_rol_enum"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "invitado_por_id"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "red_id"`);
        await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "barrio"`);
        await queryRunner.query(`ALTER TABLE "red" RENAME TO "sector"`);
        await queryRunner.query(`ALTER TABLE "distrito" ADD CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4" FOREIGN KEY ("id_sector") REFERENCES "sector"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dicipulado" ADD CONSTRAINT "FK_dc1aa3bc35f1308b415df743707" FOREIGN KEY ("id_sector") REFERENCES "sector"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
