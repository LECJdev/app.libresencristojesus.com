import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenero1774598518000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."genero_enum" AS ENUM('MASCULINO', 'FEMENINO')`);
    await queryRunner.query(
      `ALTER TABLE "persona" ADD COLUMN "genero" "public"."genero_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "genero"`);
    await queryRunner.query(`DROP TYPE "public"."genero_enum"`);
  }
}
