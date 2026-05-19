import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentoToPersona1774513583118 implements MigrationInterface {
  name = 'AddDocumentoToPersona1774513583118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD "documento" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."genero_enum" RENAME TO "genero_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."persona_genero_enum" AS ENUM('MASCULINO', 'FEMENINO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "genero" TYPE "public"."persona_genero_enum" USING "genero"::"text"::"public"."persona_genero_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."genero_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."genero_enum_old" AS ENUM('MASCULINO', 'FEMENINO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ALTER COLUMN "genero" TYPE "public"."genero_enum_old" USING "genero"::"text"::"public"."genero_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."persona_genero_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."genero_enum_old" RENAME TO "genero_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "documento"`);
  }
}
