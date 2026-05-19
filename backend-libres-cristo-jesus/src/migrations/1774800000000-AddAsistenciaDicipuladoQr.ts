import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsistenciaDicipuladoQr1774800000000 implements MigrationInterface {
  name = 'AddAsistenciaDicipuladoQr1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."asistencia_dicipulado_qr_dia_registro_enum" AS ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."asistencia_dicipulado_qr_estado_enum" AS ENUM('ACTIVO', 'INACTIVO')`,
    );

    await queryRunner.query(
      `CREATE TABLE "asistencia_dicipulado_qr" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(150) NOT NULL, "dia_registro" "public"."asistencia_dicipulado_qr_dia_registro_enum" NOT NULL, "estado" "public"."asistencia_dicipulado_qr_estado_enum" NOT NULL DEFAULT 'ACTIVO', "qr_token" character varying(120) NOT NULL, "id_sede" character varying(50), "direccion_personalizada" character varying(255), "id_red" character varying(50), CONSTRAINT "UQ_asistencia_dicipulado_qr_qr_token" UNIQUE ("qr_token"), CONSTRAINT "PK_asistencia_dicipulado_qr_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "registro_asistencia_dicipulado_qr" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "fecha_registro" date NOT NULL, "es_nuevo" boolean NOT NULL DEFAULT false, "id_asistencia" character varying(50) NOT NULL, "id_persona" character varying(50) NOT NULL, CONSTRAINT "PK_registro_asistencia_dicipulado_qr_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_registro_asistencia_dicipulado_qr_persona_fecha" ON "registro_asistencia_dicipulado_qr" ("id_asistencia", "id_persona", "fecha_registro")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dicipulado_qr_asistencia" ON "registro_asistencia_dicipulado_qr" ("id_asistencia")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dicipulado_qr_persona" ON "registro_asistencia_dicipulado_qr" ("id_persona")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registro_asistencia_dicipulado_qr_fecha" ON "registro_asistencia_dicipulado_qr" ("fecha_registro")`,
    );

    await queryRunner.query(
      `ALTER TABLE "asistencia_dicipulado_qr" ADD CONSTRAINT "FK_asistencia_dicipulado_qr_sede" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_dicipulado_qr" ADD CONSTRAINT "FK_asistencia_dicipulado_qr_red" FOREIGN KEY ("id_red") REFERENCES "red"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dicipulado_qr" ADD CONSTRAINT "FK_registro_asistencia_dicipulado_qr_asistencia" FOREIGN KEY ("id_asistencia") REFERENCES "asistencia_dicipulado_qr"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dicipulado_qr" ADD CONSTRAINT "FK_registro_asistencia_dicipulado_qr_persona" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dicipulado_qr" DROP CONSTRAINT "FK_registro_asistencia_dicipulado_qr_persona"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_asistencia_dicipulado_qr" DROP CONSTRAINT "FK_registro_asistencia_dicipulado_qr_asistencia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_dicipulado_qr" DROP CONSTRAINT "FK_asistencia_dicipulado_qr_red"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_dicipulado_qr" DROP CONSTRAINT "FK_asistencia_dicipulado_qr_sede"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dicipulado_qr_fecha"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dicipulado_qr_persona"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registro_asistencia_dicipulado_qr_asistencia"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_registro_asistencia_dicipulado_qr_persona_fecha"`,
    );

    await queryRunner.query(`DROP TABLE "registro_asistencia_dicipulado_qr"`);
    await queryRunner.query(`DROP TABLE "asistencia_dicipulado_qr"`);

    await queryRunner.query(
      `DROP TYPE "public"."asistencia_dicipulado_qr_estado_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."asistencia_dicipulado_qr_dia_registro_enum"`,
    );
  }
}
