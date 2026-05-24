import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartamentoCiudadToPersona1775200000000
  implements MigrationInterface
{
  name = 'AddDepartamentoCiudadToPersona1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona" ADD "departamento" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "persona" ADD "ciudad" character varying(150)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "ciudad"`);
    await queryRunner.query(`ALTER TABLE "persona" DROP COLUMN "departamento"`);
  }
}
