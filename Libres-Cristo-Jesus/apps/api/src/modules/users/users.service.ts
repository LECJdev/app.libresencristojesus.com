import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { LeadershipUnitStatus, type Prisma } from '@prisma/client';
import { RoleName, ROLE_NAME_LABELS, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { UserResponseDto } from './dto/user-response.dto';

const USERNAME_CONFLICT_MESSAGE = 'Username is already in use';
const USER_NOT_FOUND_MESSAGE = 'User not found';
const VERSION_CONFLICT_MESSAGE = 'The user was modified by someone else — refresh and try again';
const ROLE_NOT_FOUND_MESSAGE = 'roleId does not match any known role';
const MAX_MEMBERS_MESSAGE = 'A LeadershipUnit may have at most 2 members';

/** Columns `GET /users` may sort by — anything else falls back to `createdAt`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['type', 'status', 'createdAt', 'updatedAt']);

type LeadershipUnitWithRoleAndMembers = Prisma.LeadershipUnitGetPayload<{
  include: { role: true; members: true };
}>;

/**
 * `LeadershipUnit` ("Usuarios") business logic — Fase 4 (doc19 section 8
 * "USERS", doc04 section 4, doc05 "Roles y Permisos", doc02 RN-006/007/008/
 * 009). Style/error-handling precedent: `AuthService`
 * (`apps/api/src/modules/auth/auth.service.ts`) — same standard NestJS
 * exceptions, same argon2 hashing, same `CatRole.name` <-> `RoleName`
 * translation via `ROLE_NAME_LABELS`. Auth itself is untouched.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: JwtPayload): Promise<UserResponseDto> {
    await this.assertMemberUsernamesAvailable(dto.members.map((member) => member.username));

    const role = await this.prisma.catRole.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException(ROLE_NOT_FOUND_MESSAGE);
    }

    this.assertCanAssignRole(actor.role, this.resolveRoleName(role.name));
    await this.assertGeneralPastorRemainsUnique(this.resolveRoleName(role.name));

    const membersData = await Promise.all(
      dto.members.map(async (member) => ({
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        phone: member.phone ?? null,
        email: member.email ?? null,
        photo: member.photo ?? null,
        birthDate: member.birthDate ? new Date(member.birthDate) : null,
        username: member.username,
        passwordHash: await argon2.hash(member.password),
        // Administrador-issued password: the member must set their own on
        // first login (same criterion the schema documents for this flag).
        mustChangePassword: true,
      })),
    );

    const unit = await this.prisma.leadershipUnit.create({
      data: {
        type: dto.type,
        roleId: dto.roleId,
        createdBy: actor.sub,
        members: { create: membersData },
      },
      include: { role: true, members: true },
    });

    return this.toResponse(unit);
  }

  async findAll(
    query: ListUsersQueryDto,
  ): Promise<{ data: UserResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.LeadershipUnitWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.search
        ? {
            OR: [
              { members: { some: { username: { contains: query.search, mode: 'insensitive' } } } },
              { type: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const orderBy = { [sortField]: query.order } as Prisma.LeadershipUnitOrderByWithRelationInput;

    const [total, units] = await this.prisma.$transaction([
      this.prisma.leadershipUnit.count({ where }),
      this.prisma.leadershipUnit.findMany({
        where,
        include: { role: true, members: { where: { deletedAt: null } } },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: units.map((unit) => this.toResponse(unit)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const unit = await this.findActiveUnitOrThrow(id);
    return this.toResponse(unit);
  }

  async update(id: string, dto: UpdateUserDto, actor: JwtPayload): Promise<UserResponseDto> {
    const unit = await this.findActiveUnitOrThrow(id);

    if (unit.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    if (dto.roleId) {
      const role = await this.prisma.catRole.findUnique({ where: { id: dto.roleId } });
      if (!role) {
        throw new BadRequestException(ROLE_NOT_FOUND_MESSAGE);
      }
      // Reassigning an existing unit INTO the Pastor General role is just
      // as capable of producing a second account as creating one.
      await this.assertGeneralPastorRemainsUnique(this.resolveRoleName(role.name), id);
    }

    if (dto.members && dto.members.length > 2) {
      throw new BadRequestException(MAX_MEMBERS_MESSAGE);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.members) {
        const keptIds = new Set(
          dto.members.filter((member) => member.id).map((member) => member.id as string),
        );
        const toRemove = unit.members.filter((member) => !keptIds.has(member.id));

        for (const member of toRemove) {
          await tx.leadershipMember.update({
            where: { id: member.id },
            data: { deletedAt: new Date(), deletedBy: actor.sub },
          });
        }

        for (const member of dto.members) {
          const data = {
            firstName: member.firstName,
            lastName: member.lastName,
            gender: member.gender,
            phone: member.phone ?? null,
            email: member.email ?? null,
            photo: member.photo ?? null,
            birthDate: member.birthDate ? new Date(member.birthDate) : null,
          };

          if (member.id) {
            // Existing member: password changes are out of scope here — they
            // go through the dedicated `PATCH /users/:id/password` endpoint,
            // which is the only place allowed to touch `passwordHash`.
            if (member.password) {
              throw new BadRequestException(
                'Password changes for an existing member must go through PATCH /users/:id/password',
              );
            }

            const current = unit.members.find((existing) => existing.id === member.id);
            let usernameChanged: string | undefined;
            if (member.username && member.username !== current?.username) {
              await this.assertUsernameAvailable(member.username, member.id);
              usernameChanged = member.username;
            }

            await tx.leadershipMember.update({
              where: { id: member.id },
              data: { ...data, ...(usernameChanged ? { username: usernameChanged } : {}) },
            });
          } else {
            // New member added via update: this is the only place a
            // credential is minted for them, so both fields are mandatory.
            if (!member.username || !member.password) {
              throw new BadRequestException('New members require both username and password');
            }

            await this.assertUsernameAvailable(member.username);
            const passwordHash = await argon2.hash(member.password);

            await tx.leadershipMember.create({
              data: {
                ...data,
                leadershipUnitId: id,
                username: member.username,
                passwordHash,
                mustChangePassword: true,
              },
            });
          }
        }
      }

      await tx.leadershipUnit.update({
        where: { id },
        data: {
          type: dto.type ?? undefined,
          roleId: dto.roleId ?? undefined,
          status: dto.status ?? undefined,
          updatedBy: actor.sub,
          version: { increment: 1 },
        },
      });
    });

    return this.findOne(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto, actor: JwtPayload): Promise<void> {
    const unit = await this.findActiveUnitOrThrow(id);

    if (unit.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    const member = unit.members.find((candidate) => candidate.id === dto.memberId);
    if (!member) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.leadershipMember.update({
        where: { id: dto.memberId },
        // Administrador-issued reset: the member must set their own on
        // next login (same criterion the schema documents for this flag).
        data: { passwordHash, mustChangePassword: true },
      });
      // The optimistic-locking contract documented on `ChangePasswordDto`
      // is "must match the current LeadershipUnit.version" even though the
      // row that physically changed is a member — so the Unit's version
      // still advances here.
      await tx.leadershipUnit.update({
        where: { id },
        data: { updatedBy: actor.sub, version: { increment: 1 } },
      });
    });
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActiveUnitOrThrow(id);

    await this.prisma.leadershipUnit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: LeadershipUnitStatus.RETIRED,
        version: { increment: 1 },
      },
    });
  }

  /**
   * `LeadershipUnit` lost its own `username` column when credentials moved
   * to `LeadershipMember` — uniqueness now has two layers: within the
   * submitted array itself (two members of the same request sharing a
   * username), and against every other member already in the database.
   */
  private async assertMemberUsernamesAvailable(usernames: string[]): Promise<void> {
    const seen = new Set<string>();
    for (const username of usernames) {
      if (seen.has(username)) {
        throw new ConflictException(USERNAME_CONFLICT_MESSAGE);
      }
      seen.add(username);
    }

    const existing = await this.prisma.leadershipMember.findFirst({
      where: { username: { in: usernames } },
    });
    if (existing) {
      throw new ConflictException(USERNAME_CONFLICT_MESSAGE);
    }
  }

  /** Single-member uniqueness check used by `update` (renames, new members). */
  private async assertUsernameAvailable(username: string, excludeMemberId?: string): Promise<void> {
    const existing = await this.prisma.leadershipMember.findFirst({
      where: { username, ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {}) },
    });
    if (existing) {
      throw new ConflictException(USERNAME_CONFLICT_MESSAGE);
    }
  }

  private async findActiveUnitOrThrow(id: string): Promise<LeadershipUnitWithRoleAndMembers> {
    const unit = await this.prisma.leadershipUnit.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, members: { where: { deletedAt: null } } },
    });

    if (!unit) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }

    return unit;
  }

  /**
   * Doc05's "who can create which role" rule — the `RolePermission` grant
   * checked by `ScopeGuard` only answers "can this role create *a* user at
   * all", not "which target role". This is the finer-grained half:
   * - Administrador: unrestricted (doc05 Rol 1 "Crear cualquier usuario").
   * - Pastor General: any role except Administrador (doc05 Rol 2
   *   "No puede: Crear Administradores" — everything else is implicitly
   *   allowed, confirmed by the Matriz de Permisos "Crear Usuario Líder"
   *   row).
   * - Pastor Distrito: Líder only (doc05 Rol 3 "Puede: Crear usuarios
   *   Líder" / "No puede: Crear Pastores Generales").
   * - Líder: never reaches this check — no `RolePermission` grant exists
   *   for `user:create` on that role — but rejected defensively anyway.
   */
  /**
   * Enforces that **exactly one** Pastores Generales account can exist.
   *
   * doc06 §2 places "Pastores Generales" as a single node directly under
   * the church, and the module brief is explicit: although two people are
   * involved (Pastor and Pastora), there is only ONE access account. They
   * are the two `LeadershipMember` rows of that single `LeadershipUnit` —
   * not two units.
   *
   * Nothing in the database expresses this: `CatRole` has no cardinality,
   * and a partial unique index on a soft-deleted table would fight the
   * `deletedAt` convention. So the rule lives here, and it is checked on
   * BOTH creation and role reassignment — either path can produce the
   * second account this forbids.
   *
   * Soft-deleted units are excluded: a retired Pastores Generales account
   * must not block naming the next one.
   */
  private async assertGeneralPastorRemainsUnique(
    targetRole: RoleName,
    excludeUnitId?: string,
  ): Promise<void> {
    if (targetRole !== RoleName.GENERAL_PASTOR) {
      return;
    }

    const existing = await this.prisma.leadershipUnit.findFirst({
      where: {
        deletedAt: null,
        role: { name: ROLE_NAME_LABELS[RoleName.GENERAL_PASTOR] },
        ...(excludeUnitId ? { NOT: { id: excludeUnitId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe la cuenta de Pastores Generales. El sistema admite una sola: registre a la ' +
          'pareja como los dos integrantes de esa cuenta.',
      );
    }
  }

  private assertCanAssignRole(actorRole: RoleName, targetRole: RoleName): void {
    if (actorRole === RoleName.ADMIN) {
      return;
    }

    if (actorRole === RoleName.GENERAL_PASTOR) {
      if (targetRole === RoleName.ADMIN) {
        throw new ForbiddenException('Pastor General cannot create Administrador users');
      }
      return;
    }

    if (actorRole === RoleName.DISTRICT_PASTOR) {
      if (targetRole !== RoleName.LEADER) {
        throw new ForbiddenException('Pastor Distrito can only create Líder users');
      }
      return;
    }

    // Escuela Kids (Fase 11): un KIDS_LEADER "designa auxiliares" creando
    // usuarios KIDS_ASSISTANT — nunca otro KIDS_LEADER (eso es ADMIN-only,
    // ver `KidsSchoolsService.createAssignment`) ni ningún otro rol.
    if (actorRole === RoleName.KIDS_LEADER) {
      if (targetRole !== RoleName.KIDS_ASSISTANT) {
        throw new ForbiddenException('Líder Escuela Kids can only create Auxiliar Escuela Kids users');
      }
      return;
    }

    throw new ForbiddenException('Insufficient role to create users');
  }

  /**
   * `CatRole.name` stores the Spanish label; API/business logic needs the
   * English `RoleName` enum. Same translation `AuthService.resolveRoleName`
   * performs — duplicated here rather than imported, since Auth is a
   * finished/verified module this phase must not touch or depend on.
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

  private toResponse(unit: LeadershipUnitWithRoleAndMembers): UserResponseDto {
    return {
      id: unit.id,
      type: unit.type,
      photo: unit.photo,
      roleId: unit.roleId,
      role: this.resolveRoleName(unit.role.name),
      status: unit.status,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      createdBy: unit.createdBy,
      updatedBy: unit.updatedBy,
      version: unit.version,
      members: unit.members.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        phone: member.phone,
        email: member.email,
        photo: member.photo,
        birthDate: member.birthDate,
        username: member.username,
        mustChangePassword: member.mustChangePassword,
      })),
    };
  }
}
