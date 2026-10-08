import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus, type Permission, type Prisma, type RolePermission } from '@prisma/client';
import type { PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';
import type { ListPermissionsQueryDto } from './dto/list-permissions-query.dto';
import type { PermissionResponseDto } from './dto/permission-response.dto';
import type { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import type { RolePermissionResponseDto } from './dto/role-permission-response.dto';

const PERMISSION_CONFLICT_MESSAGE = 'A permission with this resource/action already exists';
const PERMISSION_NOT_FOUND_MESSAGE = 'Permission not found';
const PERMISSION_HAS_GRANTS_MESSAGE =
  'This permission has active role grants and cannot be deleted — revoke every RolePermission grant first';
const ROLE_NOT_FOUND_MESSAGE = 'roleId does not match any known role';
const PERMISSION_TARGET_NOT_FOUND_MESSAGE = 'permissionId does not match any known permission';
const GRANT_CONFLICT_MESSAGE = 'This role already has this permission granted';
const GRANT_NOT_FOUND_MESSAGE = 'Role-permission grant not found';

/** Columns `GET /permissions` may sort by — anything else falls back to `createdAt`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set([
  'resource',
  'action',
  'status',
  'createdAt',
  'updatedAt',
]);

type RolePermissionWithPermission = Prisma.RolePermissionGetPayload<{
  include: { permission: true };
}>;

/**
 * `Permission`/`RolePermission` business logic — Fase 4. `Permission` and
 * `RolePermission` are not part of `Documentos/04-modelo-de-datos.md`; they
 * are a deliberate architecture decision by the project owner, replacing
 * doc05's conceptual "Matriz de Permisos" with a real, manageable table
 * that `ScopeGuard` (`apps/api/src/common/security/guards/scope.guard.ts`)
 * reads at request time. This module is itself gated by its own catalog
 * (`permission`/`role-permission` resources, seeded Administrador-only —
 * `prisma/seed.ts`), since permission management is the most sensitive
 * security surface in the system.
 *
 * Style/error-handling precedent: `UsersService`
 * (`apps/api/src/modules/users/users.service.ts`) — same standard NestJS
 * exceptions, same soft-delete convention. Users/Roles are finished/
 * verified modules this phase must not touch or depend on.
 *
 * Design decisions (see task brief):
 * - `remove(id)` (`DELETE /permissions/:id`) checks for active
 *   `RolePermission` grants FIRST and rejects with 409 if any exist,
 *   rather than soft-deleting anyway. A soft-deleted `Permission` that
 *   still has live grants would leave `ScopeGuard.checkPermission` able to
 *   authorize requests against a permission the API otherwise reports as
 *   "deleted" (`findOne`/`findAll` filter `deletedAt: null`) — a silent
 *   security/consistency gap. The caller must revoke every grant via
 *   `DELETE /permissions/role-assignments/:id` first; the FK
 *   (`onDelete: Restrict`) would block a *hard* delete anyway, but this
 *   check gives a clear 409 instead of a raw DB constraint error.
 * - `createRoleAssignment` (grant) rejects an already-granted
 *   `(roleId, permissionId)` pair with 409, the same way `UsersService`
 *   rejects a duplicate username — NOT idempotent. `RolePermission` grants
 *   are the security surface `@Audit('RolePermission', 'CREATE')` records;
 *   silently succeeding on a duplicate would either (a) skip the audit
 *   write for the second call, hiding that someone attempted to grant an
 *   already-granted permission, or (b) write a second, misleading "CREATE"
 *   audit entry for a row that already existed. A 409 keeps the audit
 *   trail honest and matches every other unique-constraint conflict in
 *   this codebase (`UsersService.create`, `PermissionsService.create`
 *   below).
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto, actor: JwtPayload): Promise<PermissionResponseDto> {
    const existing = await this.prisma.permission.findUnique({
      where: { resource_action: { resource: dto.resource, action: dto.action } },
    });
    if (existing) {
      throw new ConflictException(PERMISSION_CONFLICT_MESSAGE);
    }

    const permission = await this.prisma.permission.create({
      data: {
        resource: dto.resource,
        action: dto.action,
        description: dto.description ?? null,
        createdBy: actor.sub,
      },
    });

    return this.toResponse(permission);
  }

  async findAll(
    query: ListPermissionsQueryDto,
  ): Promise<{ data: PermissionResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.PermissionWhereInput = {
      deletedAt: null,
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.search
        ? {
            OR: [
              { resource: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const orderBy = { [sortField]: query.order } as Prisma.PermissionOrderByWithRelationInput;

    const [total, permissions] = await this.prisma.$transaction([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: permissions.map((permission) => this.toResponse(permission)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.findActivePermissionOrThrow(id);
    return this.toResponse(permission);
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
    actor: JwtPayload,
  ): Promise<PermissionResponseDto> {
    await this.findActivePermissionOrThrow(id);

    const permission = await this.prisma.permission.update({
      where: { id },
      data: {
        description: dto.description,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.toResponse(permission);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActivePermissionOrThrow(id);

    const activeGrants = await this.prisma.rolePermission.count({ where: { permissionId: id } });
    if (activeGrants > 0) {
      throw new ConflictException(PERMISSION_HAS_GRANTS_MESSAGE);
    }

    await this.prisma.permission.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  async createRoleAssignment(dto: CreateRoleAssignmentDto): Promise<RolePermissionResponseDto> {
    const role = await this.prisma.catRole.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException(ROLE_NOT_FOUND_MESSAGE);
    }

    const permission = await this.prisma.permission.findFirst({
      where: { id: dto.permissionId, deletedAt: null },
    });
    if (!permission) {
      throw new BadRequestException(PERMISSION_TARGET_NOT_FOUND_MESSAGE);
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: dto.roleId, permissionId: dto.permissionId } },
    });
    if (existing) {
      throw new ConflictException(GRANT_CONFLICT_MESSAGE);
    }

    const grant = await this.prisma.rolePermission.create({
      data: { roleId: dto.roleId, permissionId: dto.permissionId },
      include: { permission: true },
    });

    return this.toGrantResponse(grant);
  }

  async removeRoleAssignment(id: string): Promise<void> {
    const grant = await this.prisma.rolePermission.findUnique({ where: { id } });
    if (!grant) {
      throw new NotFoundException(GRANT_NOT_FOUND_MESSAGE);
    }

    await this.prisma.rolePermission.delete({ where: { id } });
  }

  async findRolePermissions(roleId: string): Promise<RolePermissionResponseDto[]> {
    const role = await this.prisma.catRole.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    const grants = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: { createdAt: 'asc' },
    });

    return grants.map((grant) => this.toGrantResponse(grant));
  }

  private async findActivePermissionOrThrow(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findFirst({ where: { id, deletedAt: null } });

    if (!permission) {
      throw new NotFoundException(PERMISSION_NOT_FOUND_MESSAGE);
    }

    return permission;
  }

  private toResponse(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      status: permission.status,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      createdBy: permission.createdBy,
      updatedBy: permission.updatedBy,
      version: permission.version,
    };
  }

  private toGrantResponse(
    grant: RolePermissionWithPermission | (RolePermission & { permission: Permission }),
  ): RolePermissionResponseDto {
    return {
      id: grant.id,
      roleId: grant.roleId,
      permissionId: grant.permissionId,
      createdAt: grant.createdAt,
      permission: this.toResponse(grant.permission),
    };
  }
}
