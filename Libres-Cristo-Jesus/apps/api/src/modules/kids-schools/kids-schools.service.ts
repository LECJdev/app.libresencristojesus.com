import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  KidsAssignmentRole,
  Prisma,
  RecordStatus,
  type KidsSchool,
  type KidsUserAssignment,
} from '@prisma/client';
import { ROLE_NAME_LABELS, RoleName } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreateKidsAssignmentDto } from './dto/create-kids-assignment.dto';
import type { CreateKidsSchoolDto } from './dto/create-kids-school.dto';
import type { KidsAssignmentResponseDto } from './dto/kids-assignment-response.dto';
import type { KidsSchoolResponseDto } from './dto/kids-school-response.dto';
import type { UpdateKidsSchoolDto } from './dto/update-kids-school.dto';

const SCHOOL_NOT_FOUND_MESSAGE = 'KidsSchool not found';
const DUPLICATE_NAME_MESSAGE = 'A KidsSchool with this name already exists';
const VERSION_CONFLICT_MESSAGE =
  'The KidsSchool was modified by someone else — refresh and try again';
const LEADERSHIP_UNIT_NOT_FOUND_MESSAGE = 'leadershipUnitId does not match any LeadershipUnit';
const ASSIGNMENT_NOT_FOUND_MESSAGE = 'Assignment not found';
const ONLY_ADMIN_ASSIGNS_LEADER_MESSAGE =
  "Only ADMIN may assign or change a KidsSchool's KIDS_LEADER";
const ONLY_ADMIN_OR_LEADER_ASSIGNS_MESSAGE =
  'Only ADMIN or the school\'s own KIDS_LEADER may create assignments';
const WRONG_ROLE_FOR_LEADER_MESSAGE = `leadershipUnitId must reference a LeadershipUnit whose role is "${ROLE_NAME_LABELS[RoleName.KIDS_LEADER]}"`;
const WRONG_ROLE_FOR_ASSISTANT_MESSAGE = `leadershipUnitId must reference a LeadershipUnit whose role is "${ROLE_NAME_LABELS[RoleName.KIDS_ASSISTANT]}"`;
const ALREADY_ASSIGNED_ELSEWHERE_MESSAGE =
  'leadershipUnitId is already actively assigned to a different KidsSchool — a person belongs to a single sede at a time';
const ALREADY_ASSIGNED_HERE_MESSAGE =
  'leadershipUnitId already has an active assignment at this KidsSchool';
const CANNOT_REMOVE_LEADER_DIRECTLY_MESSAGE =
  'A LEADER assignment cannot be removed directly — create a new LEADER assignment to replace it, which closes this one automatically';
const LEADER_CONFLICT_MESSAGE =
  'Another LEADER assignment for this KidsSchool was created concurrently — refresh and try again';

/**
 * `KidsSchool` (sede) + `KidsUserAssignment` (líder/auxiliares) — Fase 11,
 * segunda mitad ("Escuela Kids"). Independiente de `PeaceHousesService`
 * (que sirve de precedente de estilo: mismo soft-delete + optimistic
 * locking, mismo patrón de `$transaction` para cambios de liderazgo con
 * historial), pero SIN el modelo de dueño único por FK — ver el comentario
 * de `ScopeResourceType.KIDS_SCHOOL`.
 *
 * Reglas de negocio definitivas del dueño del proyecto (2026-08-24, sección
 * 7 del diseño aprobado), no discutibles:
 * - 1 solo KIDS_LEADER activo por sede; cambiarlo cierra el anterior y crea
 *   uno nuevo, siempre en la misma transacción, nunca un borrado físico.
 * - Solo ADMIN crea/cambia un LEADER. Un KIDS_LEADER solo puede crear
 *   ASSISTANT, y únicamente para su propia sede (`ScopeGuard` ya lo acota).
 * - Una persona pertenece a UNA sola sede a la vez (sección 6): no puede
 *   tener una asignación activa en Norte y otra en Sur simultáneamente.
 * - Retirar un auxiliar cierra su asignación (`endDate`), nunca la borra.
 */
@Injectable()
export class KidsSchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateKidsSchoolDto, actor: JwtPayload): Promise<KidsSchoolResponseDto> {
    await this.assertNameIsUnique(dto.name);

    const school = await this.prisma.kidsSchool.create({
      data: { name: dto.name, createdBy: actor.sub },
    });

    return this.toSchoolResponse(school);
  }

  /**
   * ADMIN ve todas las sedes. KIDS_LEADER/KIDS_ASSISTANT solo ven la(s)
   * sede(s) donde tienen una asignación activa — a diferencia de
   * `PeaceHousesService.findAll` (intencionalmente abierto a todo rol), acá
   * "no exponer información de otra sede" (sección 16 del diseño aprobado)
   * aplica desde el listado mismo, no solo desde el detalle.
   */
  async findAll(actor: JwtPayload): Promise<KidsSchoolResponseDto[]> {
    const where: Prisma.KidsSchoolWhereInput = { deletedAt: null };

    if (actor.role !== RoleName.ADMIN) {
      where.assignments = {
        some: { leadershipUnitId: actor.sub, endDate: null, deletedAt: null },
      };
    }

    const schools = await this.prisma.kidsSchool.findMany({ where, orderBy: { name: 'asc' } });
    return schools.map((school) => this.toSchoolResponse(school));
  }

  async findOne(id: string): Promise<KidsSchoolResponseDto> {
    const school = await this.findActiveSchoolOrThrow(id);
    return this.toSchoolResponse(school);
  }

  async update(
    id: string,
    dto: UpdateKidsSchoolDto,
    actor: JwtPayload,
  ): Promise<KidsSchoolResponseDto> {
    const school = await this.findActiveSchoolOrThrow(id);

    if (school.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    if (dto.name !== undefined && dto.name !== school.name) {
      await this.assertNameIsUnique(dto.name, id);
    }

    const updated = await this.prisma.kidsSchool.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.toSchoolResponse(updated);
  }

  /**
   * Cierra la sede (`deletedAt`/`status: INACTIVE`), nunca un borrado
   * físico — mismo patrón que `PeaceHousesService.remove`. No revisa
   * niños/asignaciones/reuniones activas antes de cerrar: igual que una
   * Casa de Paz, cerrar la sede no exige reubicar nada (los niños y el
   * historial de reuniones no son nodos del árbol organizacional, son
   * datos propios de la sede que se preservan intactos, solo dejan de
   * listarse porque la sede misma ya no aparece en `findAll`).
   */
  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActiveSchoolOrThrow(id);

    await this.prisma.kidsSchool.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  /** Equipo ACTIVO (líder + auxiliares) de una sede — no historial completo. */
  async listAssignments(schoolId: string): Promise<KidsAssignmentResponseDto[]> {
    await this.findActiveSchoolOrThrow(schoolId);

    const assignments = await this.prisma.kidsUserAssignment.findMany({
      where: { kidsSchoolId: schoolId, endDate: null, deletedAt: null },
      orderBy: [{ role: 'asc' }, { startDate: 'asc' }],
    });

    return assignments.map((assignment) => this.toAssignmentResponse(assignment));
  }

  async createAssignment(
    schoolId: string,
    dto: CreateKidsAssignmentDto,
    actor: JwtPayload,
  ): Promise<KidsAssignmentResponseDto> {
    await this.findActiveSchoolOrThrow(schoolId);

    if (dto.role === KidsAssignmentRole.LEADER) {
      if (actor.role !== RoleName.ADMIN) {
        throw new ForbiddenException(ONLY_ADMIN_ASSIGNS_LEADER_MESSAGE);
      }
    } else if (actor.role !== RoleName.ADMIN && actor.role !== RoleName.KIDS_LEADER) {
      // Defensa en profundidad: `kids-assignment:create` no se le concede a
      // KIDS_ASSISTANT en `prisma/seed.ts`, así que `ScopeGuard` ya lo
      // bloquea antes de llegar acá — este chequeo cubre un rol futuro que
      // reciba ese permiso sin haber sido pensado para crear asignaciones.
      throw new ForbiddenException(ONLY_ADMIN_OR_LEADER_ASSIGNS_MESSAGE);
    }

    const expectedRole =
      dto.role === KidsAssignmentRole.LEADER ? RoleName.KIDS_LEADER : RoleName.KIDS_ASSISTANT;
    await this.assertLeadershipUnitHasRole(dto.leadershipUnitId, expectedRole);
    await this.assertNotActiveAtAnotherSchool(dto.leadershipUnitId, schoolId);

    if (dto.role === KidsAssignmentRole.ASSISTANT) {
      await this.assertNotAlreadyActiveHere(dto.leadershipUnitId, schoolId);
    }

    try {
      const assignment = await this.prisma.$transaction(async (tx) => {
        if (dto.role === KidsAssignmentRole.LEADER) {
          // Cierra la asignación de líder anterior (si la hay) y cualquier
          // asignación activa que ya tuviera este mismo leadershipUnitId en
          // esta sede (ej. lo promueven de auxiliar a líder) ANTES de abrir
          // la nueva — nunca un borrado físico (RN definitiva sección 7).
          await tx.kidsUserAssignment.updateMany({
            where: {
              kidsSchoolId: schoolId,
              endDate: null,
              deletedAt: null,
              OR: [
                { role: KidsAssignmentRole.LEADER },
                { leadershipUnitId: dto.leadershipUnitId },
              ],
            },
            data: { endDate: new Date(), updatedBy: actor.sub },
          });
        }

        return tx.kidsUserAssignment.create({
          data: {
            kidsSchoolId: schoolId,
            leadershipUnitId: dto.leadershipUnitId,
            role: dto.role,
            reason:
              dto.reason ??
              (dto.role === KidsAssignmentRole.LEADER
                ? 'Asignación de líder'
                : 'Asignación de auxiliar'),
            createdBy: actor.sub,
          },
        });
      });

      return this.toAssignmentResponse(assignment);
    } catch (error) {
      // P2002 = violación del índice único parcial (fase 1): dos requests
      // concurrentes intentando dejar dos LEADER activos, o la misma
      // persona con dos asignaciones activas a la misma sede. Un 409 claro,
      // nunca un 500 crudo.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          dto.role === KidsAssignmentRole.LEADER
            ? LEADER_CONFLICT_MESSAGE
            : ALREADY_ASSIGNED_HERE_MESSAGE,
        );
      }
      throw error;
    }
  }

  /**
   * Retira un auxiliar (cierra `endDate`, nunca borra). Un LEADER no se
   * retira por esta vía: cambiar de líder es `createAssignment` con
   * `role: LEADER`, que cierra el anterior automáticamente — permitir
   * también un DELETE directo dejaría una sede sin líder sin pasar por el
   * flujo transaccional de reemplazo.
   */
  async removeAssignment(
    schoolId: string,
    assignmentId: string,
    actor: JwtPayload,
  ): Promise<void> {
    await this.findActiveSchoolOrThrow(schoolId);

    const assignment = await this.prisma.kidsUserAssignment.findFirst({
      where: { id: assignmentId, kidsSchoolId: schoolId, endDate: null, deletedAt: null },
    });

    if (!assignment) {
      throw new NotFoundException(ASSIGNMENT_NOT_FOUND_MESSAGE);
    }

    if (assignment.role === KidsAssignmentRole.LEADER) {
      throw new BadRequestException(CANNOT_REMOVE_LEADER_DIRECTLY_MESSAGE);
    }

    await this.prisma.kidsUserAssignment.update({
      where: { id: assignmentId },
      data: { endDate: new Date(), reason: 'Auxiliar retirado', updatedBy: actor.sub },
    });
  }

  private async assertNameIsUnique(name: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.kidsSchool.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_NAME_MESSAGE);
    }
  }

  private async assertLeadershipUnitHasRole(
    leadershipUnitId: string,
    expectedRole: RoleName,
  ): Promise<void> {
    const unit = await this.prisma.leadershipUnit.findFirst({
      where: { id: leadershipUnitId, deletedAt: null },
      include: { role: true },
    });

    if (!unit) {
      throw new NotFoundException(LEADERSHIP_UNIT_NOT_FOUND_MESSAGE);
    }

    if (unit.role.name !== ROLE_NAME_LABELS[expectedRole]) {
      throw new BadRequestException(
        expectedRole === RoleName.KIDS_LEADER
          ? WRONG_ROLE_FOR_LEADER_MESSAGE
          : WRONG_ROLE_FOR_ASSISTANT_MESSAGE,
      );
    }
  }

  /** Sección 6 del diseño aprobado: una persona pertenece a UNA sola sede a la vez. */
  private async assertNotActiveAtAnotherSchool(
    leadershipUnitId: string,
    schoolId: string,
  ): Promise<void> {
    const existing = await this.prisma.kidsUserAssignment.findFirst({
      where: { leadershipUnitId, endDate: null, deletedAt: null, NOT: { kidsSchoolId: schoolId } },
    });

    if (existing) {
      throw new ConflictException(ALREADY_ASSIGNED_ELSEWHERE_MESSAGE);
    }
  }

  private async assertNotAlreadyActiveHere(
    leadershipUnitId: string,
    schoolId: string,
  ): Promise<void> {
    const existing = await this.prisma.kidsUserAssignment.findFirst({
      where: { leadershipUnitId, kidsSchoolId: schoolId, endDate: null, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(ALREADY_ASSIGNED_HERE_MESSAGE);
    }
  }

  private async findActiveSchoolOrThrow(id: string): Promise<KidsSchool> {
    const school = await this.prisma.kidsSchool.findFirst({ where: { id, deletedAt: null } });

    if (!school) {
      throw new NotFoundException(SCHOOL_NOT_FOUND_MESSAGE);
    }

    return school;
  }

  private toSchoolResponse(school: KidsSchool): KidsSchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      status: school.status,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      createdBy: school.createdBy,
      updatedBy: school.updatedBy,
      version: school.version,
    };
  }

  private toAssignmentResponse(assignment: KidsUserAssignment): KidsAssignmentResponseDto {
    return {
      id: assignment.id,
      kidsSchoolId: assignment.kidsSchoolId,
      leadershipUnitId: assignment.leadershipUnitId,
      role: assignment.role,
      canCreateChild: assignment.canCreateChild,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      reason: assignment.reason,
      createdBy: assignment.createdBy,
      createdAt: assignment.createdAt,
    };
  }
}
