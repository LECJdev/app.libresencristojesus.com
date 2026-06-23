import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCasaPazQrRolesAndSessions1775600000000
  implements MigrationInterface
{
  name = 'AddCasaPazQrRolesAndSessions1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD "id_persona_a_cargo" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD "id_anfitrion" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD "id_lider_principal" character varying(50)`,
    );

    await queryRunner.query(
      `CREATE TABLE "casa_paz_sesion" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_asistencia_casa_paz_qr" character varying(50) NOT NULL, "fecha" date NOT NULL, "monto_ofrenda" numeric(12,2) NOT NULL DEFAULT '0', CONSTRAINT "CHK_casa_paz_sesion_monto_ofrenda_non_negative" CHECK (monto_ofrenda >= 0), CONSTRAINT "PK_casa_paz_sesion_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_casa_paz_sesion_asistencia_fecha" ON "casa_paz_sesion" ("id_asistencia_casa_paz_qr", "fecha")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_casa_paz_sesion_asistencia" ON "casa_paz_sesion" ("id_asistencia_casa_paz_qr")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_casa_paz_sesion_fecha" ON "casa_paz_sesion" ("fecha")`,
    );

    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD CONSTRAINT "FK_asistencia_casa_paz_qr_persona_a_cargo" FOREIGN KEY ("id_persona_a_cargo") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD CONSTRAINT "FK_asistencia_casa_paz_qr_anfitrion" FOREIGN KEY ("id_anfitrion") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" ADD CONSTRAINT "FK_asistencia_casa_paz_qr_lider_principal" FOREIGN KEY ("id_lider_principal") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" ADD CONSTRAINT "FK_casa_paz_sesion_asistencia_qr" FOREIGN KEY ("id_asistencia_casa_paz_qr") REFERENCES "asistencia_casa_paz_qr"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "casa_paz_sesion" DROP CONSTRAINT "FK_casa_paz_sesion_asistencia_qr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP CONSTRAINT "FK_asistencia_casa_paz_qr_lider_principal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP CONSTRAINT "FK_asistencia_casa_paz_qr_anfitrion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP CONSTRAINT "FK_asistencia_casa_paz_qr_persona_a_cargo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_casa_paz_sesion_fecha"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_casa_paz_sesion_asistencia"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_casa_paz_sesion_asistencia_fecha"`,
    );
    await queryRunner.query(`DROP TABLE "casa_paz_sesion"`);
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP COLUMN "id_lider_principal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP COLUMN "id_anfitrion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencia_casa_paz_qr" DROP COLUMN "id_persona_a_cargo"`,
    );
  }
}
