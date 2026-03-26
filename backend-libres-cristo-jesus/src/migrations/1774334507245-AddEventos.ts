import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventos1774334507245 implements MigrationInterface {
    name = 'AddEventos1774334507245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."evento_estado_enum" AS ENUM('ACTIVO', 'INACTIVO')`);
        await queryRunner.query(`CREATE TABLE "evento" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(150) NOT NULL, "estado" "public"."evento_estado_enum" NOT NULL DEFAULT 'ACTIVO', "generaQr" boolean NOT NULL DEFAULT true, "camposPersonalizados" jsonb, CONSTRAINT "PK_ceb2e9607555230aee6aff546b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asistencia_evento" ("id" character varying(50) NOT NULL, "fecha_asistencia" TIMESTAMP NOT NULL DEFAULT now(), "datosPersonalizados" jsonb, "evento_id" character varying(50), "persona_id" character varying(50), CONSTRAINT "PK_b3ebd74c93be11bd70377363d67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "asistencia_evento" ADD CONSTRAINT "FK_27fb36621e3af03c9c8c616988f" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_evento" ADD CONSTRAINT "FK_dcaaea7c350c2ace08a85737aa1" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asistencia_evento" DROP CONSTRAINT "FK_dcaaea7c350c2ace08a85737aa1"`);
        await queryRunner.query(`ALTER TABLE "asistencia_evento" DROP CONSTRAINT "FK_27fb36621e3af03c9c8c616988f"`);
        await queryRunner.query(`DROP TABLE "asistencia_evento"`);
        await queryRunner.query(`DROP TABLE "evento"`);
        await queryRunner.query(`DROP TYPE "public"."evento_estado_enum"`);
    }

}
