import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsistenciaDominical1774701200000 implements MigrationInterface {
  name = 'AddAsistenciaDominical1774701200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."asistencia_dominical_dia_registro_enum" AS ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."asistencia_dominical_estado_enum" AS ENUM('ACTIVO', 'INACTIVO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "asistencia_dominical" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(150) NOT NULL, "dia_registro" "public"."asistencia_dominical_dia_registro_enum" NOT NULL, "estado" "public"."asistencia_dominical_estado_enum" NOT NULL DEFAULT 'ACTIVO', "qr_token" character varying(120) NOT NULL, "id_sede" character varying(50) NOT NULL, CONSTRAINT "UQ_asistencia_dominical_qr_token" UNIQUE ("qr_token"), CONSTRAINT "PK_asistencia_dominical_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "registro_asistencia_dominical" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "fecha_registro" date NOT NULL, "es_nuevo" boolean NOT NULL DEFAULT false, "id_asistencia" character varying(50) NOT NULL, "id_persona" character varying(50) NOT NULL, CONSTRAINT "PK_registro_asistencia_dominical_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_registro_asistencia_dominical_persona_fecha" ON "registro_asistencia_dominical" ("id_asistencia", "id_persona", "fecha_registro")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dominical_asistencia" ON "registro_asistencia_dominical" ("id_asistencia")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dominical_persona" ON "registro_asistencia_dominical" ("id_persona")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dominical_fecha" ON "registro_asistencia_dominical" ("fecha_registro")`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_dominical" ADD CONSTRAINT "FK_asistencia_dominical_sede" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dominical" ADD CONSTRAINT "FK_registro_asistencia_dominical_asistencia" FOREIGN KEY ("id_asistencia") REFERENCES "asistencia_dominical"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dominical" ADD CONSTRAINT "FK_registro_asistencia_dominical_persona" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dominical" DROP CONSTRAINT "FK_registro_asistencia_dominical_persona"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dominical" DROP CONSTRAINT "FK_registro_asistencia_dominical_asistencia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_dominical" DROP CONSTRAINT "FK_asistencia_dominical_sede"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dominical_fecha"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dominical_persona"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dominical_asistencia"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_registro_asistencia_dominical_persona_fecha"`,
    );
    await queryRunner.query(`DROP TABLE "registro_asistencia_dominical"`);
    await queryRunner.query(`DROP TABLE "asistencia_dominical"`);
    await queryRunner.query(
      `DROP TYPE "public"."asistencia_dominical_estado_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."asistencia_dominical_dia_registro_enum"`,
    );
  }
}
