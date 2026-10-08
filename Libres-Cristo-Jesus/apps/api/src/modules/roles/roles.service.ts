import { Injectable, NotFoundException } from '@nestjs/common';
import type { CatRole } from '@prisma/client';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RoleResponseDto } from './dto/role-response.dto';

const ROLE_NOT_FOUND_MESSAGE = 'Role not found';

/**
 * `CatRole` ("Roles") — Fase 4, read-only. doc04 §4 describes `CatRole` as
 * a plain catalog (id/name/description) with "Roles iniciales: Administrador,
 * Pastor General, Pastor Distrito, Líder", and doc05 states the 4 roles
 * "serán administrados desde la base de datos" (i.e. seeded/managed
 * directly at the DB level, not through the app) and never lists a
 * "Crear Rol"/"Editar Rol"/"Eliminar Rol" capability anywhere in its
 * Matriz de Permisos or per-role capability lists — unlike Distritos/Casas
 * de Paz, which do get explicit "Crear"/"Editar" rows. `RoleName` in
 * `packages/types` is also a hardcoded 4-member enum, so dynamically
 * creating/renaming/deleting roles through this API would desync the
 * catalog from that enum. This module therefore only exposes `findAll`/
 * `findOne` — no create/update/delete, matching the doc's "fixed catalog"
 * treatment of roles.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.catRole.findMany({ orderBy: { name: 'asc' } });
    return roles.map((role) => this.toResponse(role));
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.catRole.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    return this.toResponse(role);
  }

  /**
   * `CatRole.name` stores the Spanish label; API/business logic needs the
   * English `RoleName` enum. Same translation `UsersService.resolveRoleName`/
   * `AuthService.resolveRoleName` perform — duplicated here rather than
   * imported, since Auth/Users are finished/verified modules this phase
   * must not touch or depend on.
   */
  private resolveRoleName(catRoleName: string): RoleName {
    const match = (Object.entries(ROLE_NAME_LABELS) as [RoleName, string][]).find(
      ([, label]) => label === catRoleName,
    );

    if (!match) {
      throw new Error(`CatRole.name "${catRoleName}" does not match any known RoleName label`);
    }

    return match[0];
  }

  private toResponse(role: CatRole): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      roleName: this.resolveRoleName(role.name),
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
