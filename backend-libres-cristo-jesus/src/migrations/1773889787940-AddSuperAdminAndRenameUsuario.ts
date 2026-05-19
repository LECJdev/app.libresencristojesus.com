import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperAdminAndRenameUsuario1773889787940 implements MigrationInterface {
  name = 'AddSuperAdminAndRenameUsuario1773889787940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // En instalaciones nuevas, los roles SUPER_ADMIN e INTEGRANTE
    // ya vienen definidos en la migración previa AddRoleAndPassword.
    // No se requiere migración de datos de 'USUARIO' a 'INTEGRANTE'.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No requiere acción reversa para esquemas nuevos unificados.
  }
}
