import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus, type District, type Prisma } from '@prisma/client';
import { ROLE_NAME_LABELS, RoleName, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreateDistrictDto } from './dto/create-district.dto';
import type { UpdateDistrictDto } from './dto/update-district.dto';
import type { ListDistrictsQueryDto } from './dto/list-districts-query.dto';
import type { DistrictResponseDto } from './dto/district-response.dto';

const DISTRICT_NOT_FOUND_MESSAGE = 'District not found';
const CHURCH_NOT_FOUND_MESSAGE = 'churchId does not match any Church';
const CHURCH_NOT_ACTIVE_MESSAGE = 'churchId matches an inactive Church';
const LEADERSHIP_UNIT_NOT_FOUND_MESSAGE = 'leadershipUnitId does not match any LeadershipUnit';
const LEADERSHIP_UNIT_WRONG_ROLE_MESSAGE =
  'leadershipUnitId must reference a LeadershipUnit whose role is "Pastor Distrito"';
const DUPLICATE_NUMBER_MESSAGE = 'A District with this number already exists for this Church';
const VERSION_CONFLICT_MESSAGE =
  'The district was modified by someone else — refresh and try again';
const DISTRICT_HAS_PEACE_HOUSES_MESSAGE =
  'This district has active Casas de Paz and cannot be deleted — close or reassign every Casa de Paz first';

/** The exact Spanish `CatRole.name` a District's pastor must hold (`packages/types/src/role.ts`). */
const DISTRICT_PASTOR_LABEL = ROLE_NAME_LABELS[RoleName.DISTRICT_PASTOR];

/** Columns `GET /districts` may sort by — anything else falls back to `createdAt`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set([
  'number',
  'name',
  'status',
  'createdAt',
  'updatedAt',
]);

/**
 * `District` business logic — Fase 4. Style/error-handling precedent:
 * `OrganizationService`/`UsersService` — same standard NestJS exceptions, same
 * soft-delete + optimistic-locking convention. Users/Roles/Permissions/Organization
 * are finished/verified modules this phase must not touch or depend on.
 *
 * Design decisions:
 * - Who can create/edit a District: doc05's Matriz de Permisos rows "Crear
 *   Distrito"/"Editar Distrito" are ✅ only for Administrador and Pastor General,
 *   ❌ for Pastor Distrito and Líder (`prisma/seed.ts`'s `DISTRICT_PERMISSIONS`).
 *   There is no "Eliminar Distrito" row in the matrix; doc06 §21 only says
 *   Administrador "Todo" and Pastores Generales "Administran toda la organización" —
 *   nothing grants Pastor Distrito or Líder the ability to remove a whole District
 *   (their doc05 capabilities top out at Casas de Paz), so `delete` gets the same
 *   Administrador/Pastor General-only grant as `create`/`update`. `list`/`read` are
 *   granted to all four roles — doc05's "Ver Organigrama" row is ✅ for everyone, and
 *   doc06 §4 says "Todos los usuarios autenticados podrán consultar el organigrama".
 * - `leadershipUnitId` validation (`create`/`update`): doc07 US-005 lets a District
 *   exist without an assigned pastor, but when a `leadershipUnitId` IS given it must
 *   reference a `LeadershipUnit` whose `CatRole.name` is exactly "Pastor Distrito" —
 *   a District can never be "led" by a Líder or any other role. Enforced by comparing
 *   against `ROLE_NAME_LABELS[RoleName.DISTRICT_PASTOR]`, the same English<->Spanish
 *   translation constant `ScopeGuard`/`AuthService`/`UsersService` already use.
 * - `(churchId, number)` uniqueness: `prisma/schema.prisma`'s `@@unique([churchId,
 *   number])` is a hard DB constraint that spans ALL rows regardless of `deletedAt`
 *   (no partial/filtered unique index) — so the pre-insert check below intentionally
 *   does NOT filter by `deletedAt: null` either; a soft-deleted District still
 *   occupies its `(churchId, number)` slot forever, matching the real DB behavior.
 * - `remove(id)` (`DELETE /districts/:id`) checks for active (non-soft-deleted)
 *   `PeaceHouse` rows FIRST and rejects with 409 if any exist — the same pattern
 *   `OrganizationService.remove` uses for active `District` rows under a `Church`.
 *   The FK (`PeaceHouse.districtId`, `onDelete: Restrict`) would block a *hard*
 *   delete anyway, but this gives a clean 409 instead of a raw DB constraint error.
 * - Known limitation (by explicit instruction, NOT fixed in this module): `ScopeGuard.
 *   isDistrictInScope` only ever returns `true` for `RoleName.DISTRICT_PASTOR` — a
 *   Líder is granted `district:read` (list/read are open to all four roles per doc05),
 *   but `GET /districts/:id`'s `scopeType: DISTRICT` check will 403 a Líder
 *   unconditionally, even for the District their own Casa de Paz belongs to. Fixing
 *   this would require changing `ScopeGuard` itself, out of scope for this module.
 */
@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDistrictDto, actor: JwtPayload): Promise<DistrictResponseDto> {
    await this.assertChurchExistsAndActive(dto.churchId);

    if (dto.leadershipUnitId) {
      await this.assertLeadershipUnitIsDistrictPastor(dto.leadershipUnitId);
    }

    await this.assertNumberIsUnique(dto.churchId, dto.number);

    const district = await this.prisma.district.create({
      data: {
        churchId: dto.churchId,
        number: dto.number,
        name: dto.name,
        description: dto.description ?? null,
        leadershipUnitId: dto.leadershipUnitId ?? null,
        createdBy: actor.sub,
      },
    });

    return this.toResponse(district);
  }

  async findAll(
    query: ListDistrictsQueryDto,
  ): Promise<{ data: DistrictResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.DistrictWhereInput = {
      deletedAt: null,
      ...(query.churchId ? { churchId: query.churchId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const orderBy = { [sortField]: query.order } as Prisma.DistrictOrderByWithRelationInput;

    const [total, districts] = await this.prisma.$transaction([
      this.prisma.district.count({ where }),
      this.prisma.district.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: districts.map((district) => this.toResponse(district)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<DistrictResponseDto> {
    const district = await this.findActiveDistrictOrThrow(id);
    return this.toResponse(district);
  }

  async update(
    id: string,
    dto: UpdateDistrictDto,
    actor: JwtPayload,
  ): Promise<DistrictResponseDto> {
    const district = await this.findActiveDistrictOrThrow(id);

    if (district.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    const targetChurchId = dto.churchId ?? district.churchId;
    const targetNumber = dto.number ?? district.number;

    if (dto.churchId) {
      await this.assertChurchExistsAndActive(dto.churchId);
    }

    if (targetChurchId !== district.churchId || targetNumber !== district.number) {
      await this.assertNumberIsUnique(targetChurchId, targetNumber, id);
    }

    if (dto.leadershipUnitId) {
      await this.assertLeadershipUnitIsDistrictPastor(dto.leadershipUnitId);
    }

    const updated = await this.prisma.district.update({
      where: { id },
      data: {
        churchId: dto.churchId ?? undefined,
        number: dto.number ?? undefined,
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        leadershipUnitId: dto.leadershipUnitId ?? undefined,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActiveDistrictOrThrow(id);

    const activePeaceHouses = await this.prisma.peaceHouse.count({
      where: { districtId: id, deletedAt: null },
    });
    if (activePeaceHouses > 0) {
      throw new ConflictException(DISTRICT_HAS_PEACE_HOUSES_MESSAGE);
    }

    await this.prisma.district.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  private async assertChurchExistsAndActive(churchId: string): Promise<void> {
    const church = await this.prisma.church.findFirst({ where: { id: churchId, deletedAt: null } });

    if (!church) {
      throw new NotFoundException(CHURCH_NOT_FOUND_MESSAGE);
    }

    if (church.status !== RecordStatus.ACTIVE) {
      throw new BadRequestException(CHURCH_NOT_ACTIVE_MESSAGE);
    }
  }

  private async assertLeadershipUnitIsDistrictPastor(leadershipUnitId: string): Promise<void> {
    const unit = await this.prisma.leadershipUnit.findFirst({
      where: { id: leadershipUnitId, deletedAt: null },
      include: { role: true },
    });

    if (!unit) {
      throw new NotFoundException(LEADERSHIP_UNIT_NOT_FOUND_MESSAGE);
    }

    if (unit.role.name !== DISTRICT_PASTOR_LABEL) {
      throw new BadRequestException(LEADERSHIP_UNIT_WRONG_ROLE_MESSAGE);
    }
  }

  /**
   * Mirrors `prisma/schema.prisma`'s `@@unique([churchId, number])`, which spans ALL
   * rows regardless of `deletedAt` — intentionally NOT filtered by `deletedAt: null`.
   */
  private async assertNumberIsUnique(
    churchId: string,
    number: number,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.district.findFirst({
      where: { churchId, number, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_NUMBER_MESSAGE);
    }
  }

  private async findActiveDistrictOrThrow(id: string): Promise<District> {
    const district = await this.prisma.district.findFirst({ where: { id, deletedAt: null } });

    if (!district) {
      throw new NotFoundException(DISTRICT_NOT_FOUND_MESSAGE);
    }

    return district;
  }

  private toResponse(district: District): DistrictResponseDto {
    return {
      id: district.id,
      churchId: district.churchId,
      number: district.number,
      name: district.name,
      description: district.description,
      leadershipUnitId: district.leadershipUnitId,
      status: district.status,
      createdAt: district.createdAt,
      updatedAt: district.updatedAt,
      createdBy: district.createdBy,
      updatedBy: district.updatedBy,
      version: district.version,
    };
  }
}
