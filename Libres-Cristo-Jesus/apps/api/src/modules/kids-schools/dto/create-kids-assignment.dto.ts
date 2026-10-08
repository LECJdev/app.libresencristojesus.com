import { ApiProperty } from '@nestjs/swagger';
import { KidsAssignmentRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * `POST /kids/schools/:id/assignments` body.
 *
 * `role: LEADER` — solo ADMIN puede crearlo (`KidsSchoolsService.createAssignment`).
 * Un KIDS_LEADER nunca puede crear otro LEADER, ni para su propia sede ni
 * para otra (RN definitiva del dueño del proyecto, sección 7 del diseño
 * aprobado) — esto NO lo cubre `RolePermission`, va como chequeo explícito
 * en el service.
 *
 * `role: ASSISTANT` — ADMIN o el KIDS_LEADER de esa misma sede (ya acotado
 * por `ScopeGuard`/`ScopeResourceType.KIDS_SCHOOL` en el controller).
 *
 * `leadershipUnitId` debe referenciar una `LeadershipUnit` cuyo `RoleName`
 * global ya sea el correspondiente (KIDS_LEADER o KIDS_ASSISTANT según
 * `role`) — crear ese usuario en sí (con credenciales) es responsabilidad
 * del módulo `users` existente, fuera del alcance de este módulo.
 */
export class CreateKidsAssignmentDto {
  @ApiProperty({
    description:
      'LeadershipUnit a asignar. Debe tener el RoleName global correspondiente (KIDS_LEADER o KIDS_ASSISTANT según `role`).',
  })
  @IsUUID()
  leadershipUnitId!: string;

  @ApiProperty({ enum: KidsAssignmentRole })
  @IsEnum(KidsAssignmentRole)
  role!: KidsAssignmentRole;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
