import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFechaNacimiento1774598517000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD COLUMN "fechaNacimiento" date NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" DROP COLUMN "fechaNacimiento"`,
    );
  }
}
