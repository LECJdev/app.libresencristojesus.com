import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1773781344431 implements MigrationInterface {
    name = 'InitialSchema1773781344431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "rango_espiritual" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(100), "detalle" text, CONSTRAINT "PK_25d8b770d7a0d8f9aaa16ca6c33" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asistencia_casa_paz" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "fecha" TIMESTAMP, "id_casa_de_paz" character varying(50), "id_persona" character varying(50), CONSTRAINT "PK_aea104a630a0e4c63f4a2a2822a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."casa_de_paz_dia_de_predica_enum" AS ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')`);
        await queryRunner.query(`CREATE TABLE "casa_de_paz" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "direccion" character varying(255), "detalle" text, "activa" boolean DEFAULT true, "dia_de_predica" "public"."casa_de_paz_dia_de_predica_enum", "id_persona_a_cargo" character varying(50), "id_distrito" character varying(50), "qr_unico" character varying(500), CONSTRAINT "PK_aa8a26a31ddb1c83c9829f6ab4d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lideres_x_casa_de_paz" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_casa_de_paz" character varying(50), "id_lider" character varying(50), CONSTRAINT "PK_057e01818ec04d48867a7f4700f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lideres_x_dicipulado" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_lider" character varying(50), "id_dicipulado" character varying(50), CONSTRAINT "PK_f20ff25403e648f6ae148ed7d36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lider" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_persona" character varying(50), "id_distrito" character varying(50), "id_rango_espiritual" character varying(50), CONSTRAINT "PK_48878b38a895344ae892d8dcd6d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asistencia_nuevos" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_sede" character varying(50), "id_persona" character varying(50), "id_persona_quien_la_invito" character varying(50), "fecha" TIMESTAMP, CONSTRAINT "PK_b9d90118aa977c79a1909c9c86e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asistencia_dicipulado" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_dicipulado" character varying(50), "id_persona" character varying(50), "fecha" TIMESTAMP, CONSTRAINT "PK_924114d9d58865c4bb7dfcf3f91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."persona_tipodocumento_enum" AS ENUM('C.C', 'T.I.', 'PT', 'C.E.')`);
        await queryRunner.query(`CREATE TABLE "persona" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombres" character varying(150), "apellidos" character varying(150), "edad" integer, "celular" character varying(20), "tipoDocumento" "public"."persona_tipodocumento_enum", "direccion" character varying(255), "correo" character varying(150), "encuentro" boolean DEFAULT false, CONSTRAINT "PK_13aefc75f60510f2be4cd243d71" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "dicipulado" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "direccion" character varying(255), "detalle" text, "id_sector" character varying(50), "id_distrito" character varying(50), "id_persona_a_cargo" character varying(50), "activa" boolean DEFAULT true, CONSTRAINT "PK_f3ef9de97c4c11b8d8294edaa08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sector" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(150), "detalles" text, CONSTRAINT "PK_668b2ea8a2f534425407732f3ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "distrito" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "id_sector" character varying(50), "id_sede" character varying(50), CONSTRAINT "PK_f8fe4693a35726401bcae2cd7e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sede" ("fecha_creacion" TIMESTAMP DEFAULT now(), "fecha_modificacion" TIMESTAMP DEFAULT now(), "id" character varying(50) NOT NULL, "nombre" character varying(150), "direccion" character varying(255), CONSTRAINT "PK_7d4d2fa286af7315120c92eb3e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "asistencia_casa_paz" ADD CONSTRAINT "FK_210f625b98e3fc53c743809c13c" FOREIGN KEY ("id_casa_de_paz") REFERENCES "casa_de_paz"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_casa_paz" ADD CONSTRAINT "FK_6446f8866d7ed78bac9880e2e7d" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "casa_de_paz" ADD CONSTRAINT "FK_a290c3bcbe0733a6d8388ea5063" FOREIGN KEY ("id_persona_a_cargo") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "casa_de_paz" ADD CONSTRAINT "FK_68cbb28507e8e63377b0af28f0b" FOREIGN KEY ("id_distrito") REFERENCES "distrito"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lideres_x_casa_de_paz" ADD CONSTRAINT "FK_c02883e1ed69c40c13062c83282" FOREIGN KEY ("id_casa_de_paz") REFERENCES "casa_de_paz"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lideres_x_casa_de_paz" ADD CONSTRAINT "FK_401d3c7032d187bf90d4af79b4f" FOREIGN KEY ("id_lider") REFERENCES "lider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lideres_x_dicipulado" ADD CONSTRAINT "FK_55227ef4f5ff334d7a5473ee7f4" FOREIGN KEY ("id_lider") REFERENCES "lider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lideres_x_dicipulado" ADD CONSTRAINT "FK_4cfa4e87ecedfcadf836a3483e1" FOREIGN KEY ("id_dicipulado") REFERENCES "dicipulado"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lider" ADD CONSTRAINT "FK_dcc9a899efefc0999877ee0290e" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lider" ADD CONSTRAINT "FK_7fdbbf23167e82380cc4fc740d4" FOREIGN KEY ("id_distrito") REFERENCES "distrito"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lider" ADD CONSTRAINT "FK_202ec117fbc1746897678db134c" FOREIGN KEY ("id_rango_espiritual") REFERENCES "rango_espiritual"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" ADD CONSTRAINT "FK_5690e61cc4ac4cd21114bd0347b" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" ADD CONSTRAINT "FK_90a30bd36dff2b32462316efae1" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" ADD CONSTRAINT "FK_bb6bacc34f1100d7b3da90e5a17" FOREIGN KEY ("id_persona_quien_la_invito") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_dicipulado" ADD CONSTRAINT "FK_c56fbaec32ef083c9bac7ca9155" FOREIGN KEY ("id_dicipulado") REFERENCES "dicipulado"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asistencia_dicipulado" ADD CONSTRAINT "FK_b865257ca83e8106f3348d9768d" FOREIGN KEY ("id_persona") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dicipulado" ADD CONSTRAINT "FK_dc1aa3bc35f1308b415df743707" FOREIGN KEY ("id_sector") REFERENCES "sector"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dicipulado" ADD CONSTRAINT "FK_ecd43231e125a990ab28045395a" FOREIGN KEY ("id_distrito") REFERENCES "distrito"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dicipulado" ADD CONSTRAINT "FK_4770353038850070dcbd87cd345" FOREIGN KEY ("id_persona_a_cargo") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "distrito" ADD CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4" FOREIGN KEY ("id_sector") REFERENCES "sector"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "distrito" ADD CONSTRAINT "FK_8413288e192029d1727ec325d9d" FOREIGN KEY ("id_sede") REFERENCES "sede"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "distrito" DROP CONSTRAINT "FK_8413288e192029d1727ec325d9d"`);
        await queryRunner.query(`ALTER TABLE "distrito" DROP CONSTRAINT "FK_4905a22fb29bea72ee174c8f9a4"`);
        await queryRunner.query(`ALTER TABLE "dicipulado" DROP CONSTRAINT "FK_4770353038850070dcbd87cd345"`);
        await queryRunner.query(`ALTER TABLE "dicipulado" DROP CONSTRAINT "FK_ecd43231e125a990ab28045395a"`);
        await queryRunner.query(`ALTER TABLE "dicipulado" DROP CONSTRAINT "FK_dc1aa3bc35f1308b415df743707"`);
        await queryRunner.query(`ALTER TABLE "asistencia_dicipulado" DROP CONSTRAINT "FK_b865257ca83e8106f3348d9768d"`);
        await queryRunner.query(`ALTER TABLE "asistencia_dicipulado" DROP CONSTRAINT "FK_c56fbaec32ef083c9bac7ca9155"`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" DROP CONSTRAINT "FK_bb6bacc34f1100d7b3da90e5a17"`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" DROP CONSTRAINT "FK_90a30bd36dff2b32462316efae1"`);
        await queryRunner.query(`ALTER TABLE "asistencia_nuevos" DROP CONSTRAINT "FK_5690e61cc4ac4cd21114bd0347b"`);
        await queryRunner.query(`ALTER TABLE "lider" DROP CONSTRAINT "FK_202ec117fbc1746897678db134c"`);
        await queryRunner.query(`ALTER TABLE "lider" DROP CONSTRAINT "FK_7fdbbf23167e82380cc4fc740d4"`);
        await queryRunner.query(`ALTER TABLE "lider" DROP CONSTRAINT "FK_dcc9a899efefc0999877ee0290e"`);
        await queryRunner.query(`ALTER TABLE "lideres_x_dicipulado" DROP CONSTRAINT "FK_4cfa4e87ecedfcadf836a3483e1"`);
        await queryRunner.query(`ALTER TABLE "lideres_x_dicipulado" DROP CONSTRAINT "FK_55227ef4f5ff334d7a5473ee7f4"`);
        await queryRunner.query(`ALTER TABLE "lideres_x_casa_de_paz" DROP CONSTRAINT "FK_401d3c7032d187bf90d4af79b4f"`);
        await queryRunner.query(`ALTER TABLE "lideres_x_casa_de_paz" DROP CONSTRAINT "FK_c02883e1ed69c40c13062c83282"`);
        await queryRunner.query(`ALTER TABLE "casa_de_paz" DROP CONSTRAINT "FK_68cbb28507e8e63377b0af28f0b"`);
        await queryRunner.query(`ALTER TABLE "casa_de_paz" DROP CONSTRAINT "FK_a290c3bcbe0733a6d8388ea5063"`);
        await queryRunner.query(`ALTER TABLE "asistencia_casa_paz" DROP CONSTRAINT "FK_6446f8866d7ed78bac9880e2e7d"`);
        await queryRunner.query(`ALTER TABLE "asistencia_casa_paz" DROP CONSTRAINT "FK_210f625b98e3fc53c743809c13c"`);
        await queryRunner.query(`DROP TABLE "sede"`);
        await queryRunner.query(`DROP TABLE "distrito"`);
        await queryRunner.query(`DROP TABLE "sector"`);
        await queryRunner.query(`DROP TABLE "dicipulado"`);
        await queryRunner.query(`DROP TABLE "persona"`);
        await queryRunner.query(`DROP TYPE "public"."persona_tipodocumento_enum"`);
        await queryRunner.query(`DROP TABLE "asistencia_dicipulado"`);
        await queryRunner.query(`DROP TABLE "asistencia_nuevos"`);
        await queryRunner.query(`DROP TABLE "lider"`);
        await queryRunner.query(`DROP TABLE "lideres_x_dicipulado"`);
        await queryRunner.query(`DROP TABLE "lideres_x_casa_de_paz"`);
        await queryRunner.query(`DROP TABLE "casa_de_paz"`);
        await queryRunner.query(`DROP TYPE "public"."casa_de_paz_dia_de_predica_enum"`);
        await queryRunner.query(`DROP TABLE "asistencia_casa_paz"`);
        await queryRunner.query(`DROP TABLE "rango_espiritual"`);
    }

}
