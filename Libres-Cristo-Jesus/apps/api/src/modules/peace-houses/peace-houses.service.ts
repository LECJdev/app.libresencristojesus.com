import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus, type PeaceHouse, type Prisma } from '@prisma/client';
import { ROLE_NAME_LABELS, RoleName, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreatePeaceHouseDto } from './dto/create-peace-house.dto';
import type { UpdatePeaceHouseDto } from './dto/update-peace-house.dto';
import type { ListPeaceHousesQueryDto } from './dto/list-peace-houses-query.dto';
import type { PeaceHouseResponseDto } from './dto/peace-house-response.dto';
import type { LeadershipHistoryResponseDto } from './dto/leadership-history-response.dto';

const PEACE_HOUSE_NOT_FOUND_MESSAGE = 'PeaceHouse not found';
const DISTRICT_NOT_FOUND_MESSAGE = 'districtId does not match any District';
const DISTRICT_NOT_ACTIVE_MESSAGE = 'districtId matches an inactive District';
const LEADERSHIP_UNIT_NOT_FOUND_MESSAGE = 'leadershipUnitId does not match any LeadershipUnit';
const LEADERSHIP_UNIT_WRONG_ROLE_MESSAGE =
  'leadershipUnitId must reference a LeadershipUnit whose role is "Líder"';
const LEADERSHIP_UNIT_ALREADY_LEADS_MESSAGE =
  'leadershipUnitId already leads another active Casa de Paz — a LeadershipUnit may lead only one';
const DUPLICATE_NAME_MESSAGE = 'A Casa de Paz with this name already exists in this District';
const VERSION_CONFLICT_MESSAGE =
  'The Casa de Paz was modified by someone else — refresh and try again';
const DUPLICATE_CODE_MESSAGE = 'A Casa de Paz with this code already exists';
const DEPARTMENT_NOT_FOUND_MESSAGE = 'departmentId does not match any CatDepartment';
const MUNICIPALITY_NOT_FOUND_MESSAGE = 'municipalityId does not match any CatMunicipality';
const MUNICIPALITY_WITHOUT_DEPARTMENT_MESSAGE =
  'municipalityId requires departmentId — a municipality cannot be recorded without its department';
const MUNICIPALITY_DEPARTMENT_MISMATCH_MESSAGE =
  'municipalityId does not belong to the given departmentId';

/** The exact Spanish `CatRole.name` a Casa de Paz's leader must hold (`packages/types/src/role.ts`). */
const LEADER_LABEL = ROLE_NAME_LABELS[RoleName.LEADER];

/** Columns `GET /peace-houses` may sort by — anything else falls back to `createdAt`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['name', 'status', 'createdAt', 'updatedAt']);

/**
 * `PeaceHouse` ("Casa de Paz") business logic — Fase 4, the last business module of the
 * phase. Style/error-handling precedent: `DistrictsService` — same standard NestJS
 * exceptions, same soft-delete + optimistic-locking convention. Users/Roles/Permissions/
 * Organization/Districts are finished/verified modules this module must not touch or
 * depend on.
 *
 * Design decisions:
 * - Who can create/update/delete a Casa de Paz: doc05's Matriz de Permisos rows "Crear Casa
 *   de Paz" and "Cerrar Casa de Paz" are both ✅ for Administrador, Pastores Generales and
 *   Pastor Distrito, ❌ for Líder (`prisma/seed.ts`'s `PEACE_HOUSE_PERMISSIONS`). There is no
 *   explicit "Editar Casa de Paz" row in the matrix, but Rol 3's own narrative ("Puede: ...
 *   Editar Casas de Paz.") grants it to Pastor Distrito, and Rol 1/Rol 2's blanket
 *   "acceso absoluto" / "Administran toda la organización" (doc06 §21, already cited by
 *   `DistrictsService`) extend it to Administrador/Pastor General too — so `update` gets the
 *   exact same three-role grant as `create`/`delete`. Líder's own "Puede" list (doc05 Rol 4)
 *   never includes editing the Casa de Paz record itself — only Personas/Reuniones/
 *   Asistencia/Ofrendas/Fotos, all out of scope for this phase — and its "No puede" list
 *   explicitly forbids "Modificar otra Casa de Paz" (read: Policy 1's scope restriction, not
 *   a grant to edit their own). `list`/`read` are granted to all four roles — doc05's
 *   "Dashboard Casa" row is ✅ for everyone, doc02 RN-045 says all users can view the
 *   organizational structure, and Rol 4 itself lists "Consultar indicadores de su Casa de
 *   Paz" as something a Líder can do.
 * - `leadershipUnitId` validation (`create`/`update`): the schema comment above
 *   `PeaceHouse.leadershipUnitId` in `prisma/schema.prisma` says it is "required there"
 *   (unlike `District.leadershipUnitId`, which is optional) — a Casa de Paz can never exist
 *   without a Líder assigned. When present it must reference a `LeadershipUnit` whose
 *   `CatRole.name` is exactly "Líder" — mirrors `DistrictsService.assertLeadershipUnitIsDistrictPastor`,
 *   comparing against `ROLE_NAME_LABELS[RoleName.LEADER]`.
 * - One Líder leads at most one active Casa de Paz: `Documentos/02-reglas-de-negocio.md`
 *   RN-019 states this explicitly — "Una Unidad de Liderazgo únicamente podrá administrar
 *   una Casa de Paz." (RN-018 is the mirror rule: "Una Casa de Paz tendrá únicamente una
 *   Unidad de Liderazgo activa.") Enforced on `create` and on `update` whenever
 *   `leadershipUnitId` changes, scoped to non-soft-deleted Casas de Paz only (a
 *   soft-deleted/closed Casa's former Líder is free to lead a new one) — 409 on violation.
 * - `(districtId, name)` uniqueness: `prisma/schema.prisma`'s `@@unique([districtId, name])`
 *   is a hard DB constraint spanning ALL rows regardless of `deletedAt` (no partial/filtered
 *   unique index, same as `District`'s `(churchId, number)`) — the pre-insert check below
 *   intentionally does NOT filter by `deletedAt: null` either, matching
 *   `DistrictsService.assertNumberIsUnique`'s documented reasoning. Also doc07 US-007's own
 *   acceptance criterion: "No permitir dos Casas iguales en el mismo Distrito."
 * - `remove(id)` (`DELETE /peace-houses/:id`, doc07 US-009 "Cerrar Casa" — "No elimina. Solo
 *   cambia estado."): unlike `DistrictsService.remove`, this does NOT check for active
 *   children first — `PeaceHouse` is the leaf of the org tree for this phase (Personas/
 *   Reuniones/Asistencia are out of scope; confirmed no model in `prisma/schema.prisma`
 *   references `peaceHouseId` yet). The soft-delete convention itself (sets `deletedAt` +
 *   `status: INACTIVE`, never a physical delete) already satisfies "No elimina. Solo cambia
 *   estado."
 */
@Injectable()
export class PeaceHousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePeaceHouseDto, actor: JwtPayload): Promise<PeaceHouseResponseDto> {
    await this.assertDistrictExistsAndActive(dto.districtId);
    await this.assertLeadershipUnitIsLeader(dto.leadershipUnitId);
    await this.assertLeaderIsNotAlreadyLeadingAnother(dto.leadershipUnitId);
    await this.assertNameIsUnique(dto.districtId, dto.name);
    await this.assertLocationIsCoherent(dto.departmentId, dto.municipalityId);
    await this.assertCodeIsUnique(dto.code);

    // One transaction so a Casa de Paz can never exist without the opening
    // row of its leadership history (doc06 §10: "Nunca se perderá
    // información") — a house whose history starts halfway through its life
    // is a gap nobody can reconstruct later.
    const peaceHouse = await this.prisma.$transaction(async (tx) => {
      const created = await tx.peaceHouse.create({
        data: {
          districtId: dto.districtId,
          leadershipUnitId: dto.leadershipUnitId,
          name: dto.name,
          code: dto.code ?? null,
          departmentId: dto.departmentId ?? null,
          municipalityId: dto.municipalityId ?? null,
          neighborhood: dto.neighborhood ?? null,
          address: dto.address ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          meetingDay: dto.meetingDay ?? null,
          meetingHour: dto.meetingHour ?? null,
          createdBy: actor.sub,
        },
      });

      await tx.peaceHouseLeadershipHistory.create({
        data: {
          peaceHouseId: created.id,
          leadershipUnitId: dto.leadershipUnitId,
          startDate: new Date(),
          reason: 'Creación de la Casa de Paz',
          createdBy: actor.sub,
        },
      });

      return created;
    });

    return this.toResponse(peaceHouse);
  }

  async findAll(
    query: ListPeaceHousesQueryDto,
  ): Promise<{ data: PeaceHouseResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.PeaceHouseWhereInput = {
      deletedAt: null,
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.municipalityId ? { municipalityId: query.municipalityId } : {}),
      ...(query.leadershipUnitId ? { leadershipUnitId: query.leadershipUnitId } : {}),
      ...(query.status ? { status: query.status } : {}),
      // Searching only `name` would fail a user who remembers the code or
      // the neighbourhood, which is most of them.
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { neighborhood: { contains: query.search, mode: 'insensitive' as const } },
              { address: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const orderBy = { [sortField]: query.order } as Prisma.PeaceHouseOrderByWithRelationInput;

    const [total, peaceHouses] = await this.prisma.$transaction([
      this.prisma.peaceHouse.count({ where }),
      this.prisma.peaceHouse.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: peaceHouses.map((peaceHouse) => this.toResponse(peaceHouse)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<PeaceHouseResponseDto> {
    const peaceHouse = await this.findActivePeaceHouseOrThrow(id);
    return this.toResponse(peaceHouse);
  }

  async update(
    id: string,
    dto: UpdatePeaceHouseDto,
    actor: JwtPayload,
  ): Promise<PeaceHouseResponseDto> {
    const peaceHouse = await this.findActivePeaceHouseOrThrow(id);

    if (peaceHouse.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    const targetDistrictId = dto.districtId ?? peaceHouse.districtId;
    const targetName = dto.name ?? peaceHouse.name;

    if (dto.districtId) {
      await this.assertDistrictExistsAndActive(dto.districtId);
    }

    if (targetDistrictId !== peaceHouse.districtId || targetName !== peaceHouse.name) {
      await this.assertNameIsUnique(targetDistrictId, targetName, id);
    }

    const isLeadershipChanging =
      dto.leadershipUnitId !== undefined && dto.leadershipUnitId !== peaceHouse.leadershipUnitId;

    if (isLeadershipChanging) {
      await this.assertLeadershipUnitIsLeader(dto.leadershipUnitId!);
      await this.assertLeaderIsNotAlreadyLeadingAnother(dto.leadershipUnitId!, id);
    }

    // The pair must stay coherent even when only ONE of the two is being
    // changed, so the effective values are resolved against the stored row
    // before validating — otherwise moving just the municipality could
    // silently strand it in a different department.
    await this.assertLocationIsCoherent(
      dto.departmentId ?? peaceHouse.departmentId ?? undefined,
      dto.municipalityId ?? peaceHouse.municipalityId ?? undefined,
    );

    if (dto.code !== undefined && dto.code !== peaceHouse.code) {
      await this.assertCodeIsUnique(dto.code, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isLeadershipChanging) {
        // Close the open period before opening the next one, so the history
        // never shows two leaders responsible for the same day.
        await tx.peaceHouseLeadershipHistory.updateMany({
          where: { peaceHouseId: id, endDate: null, deletedAt: null },
          data: { endDate: new Date(), updatedBy: actor.sub },
        });

        await tx.peaceHouseLeadershipHistory.create({
          data: {
            peaceHouseId: id,
            leadershipUnitId: dto.leadershipUnitId!,
            startDate: new Date(),
            reason: 'Cambio de liderazgo',
            createdBy: actor.sub,
          },
        });
      }

      return tx.peaceHouse.update({
        where: { id },
        data: {
          districtId: dto.districtId ?? undefined,
          leadershipUnitId: dto.leadershipUnitId ?? undefined,
          name: dto.name ?? undefined,
          code: dto.code ?? undefined,
          departmentId: dto.departmentId ?? undefined,
          municipalityId: dto.municipalityId ?? undefined,
          neighborhood: dto.neighborhood ?? undefined,
          address: dto.address ?? undefined,
          latitude: dto.latitude ?? undefined,
          longitude: dto.longitude ?? undefined,
          meetingDay: dto.meetingDay ?? undefined,
          meetingHour: dto.meetingHour ?? undefined,
          updatedBy: actor.sub,
          version: { increment: 1 },
        },
      });
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActivePeaceHouseOrThrow(id);

    await this.prisma.peaceHouse.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Full leadership history of a Casa de Paz (doc06 §10 "Todo liderazgo
   * conservará historial… Nunca se perderá información", §14 "Línea de
   * Tiempo").
   *
   * Ordered newest first: a timeline is read from "who leads it now"
   * backwards, and the current period is what a user opening the detail
   * screen is looking for.
   *
   * Soft-deleted rows are excluded but never physically removed — the
   * whole point of the table is that nothing is lost.
   */
  async findLeadershipHistory(id: string): Promise<LeadershipHistoryResponseDto[]> {
    await this.findActivePeaceHouseOrThrow(id);

    const history = await this.prisma.peaceHouseLeadershipHistory.findMany({
      where: { peaceHouseId: id, deletedAt: null },
      orderBy: { startDate: 'desc' },
      include: {
        leadershipUnit: {
          include: { members: { where: { deletedAt: null } } },
        },
      },
    });

    return history.map((entry) => ({
      id: entry.id,
      leadershipUnitId: entry.leadershipUnitId,
      members: entry.leadershipUnit.members.map((member) => ({
        firstName: member.firstName,
        lastName: member.lastName,
        photo: member.photo,
      })),
      startDate: entry.startDate,
      endDate: entry.endDate,
      reason: entry.reason,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt,
    }));
  }

  /**
   * Validates the department/municipality pair against the geographic
   * catalogs.
   *
   * The database's own foreign keys only prove each id exists — they cannot
   * prove the municipality belongs to the department, because that is a
   * relationship between two separate columns. Without this check a Casa de
   * Paz could be filed under Antioquia while sitting in a municipality of
   * Nariño, and every coverage figure derived from it would be quietly wrong.
   *
   * A municipality without a department is rejected for the same reason: it
   * would leave the row unattributable in any department-level rollup.
   */
  private async assertLocationIsCoherent(
    departmentId: string | undefined,
    municipalityId: string | undefined,
  ): Promise<void> {
    if (!departmentId && !municipalityId) {
      return;
    }

    if (municipalityId && !departmentId) {
      throw new BadRequestException(MUNICIPALITY_WITHOUT_DEPARTMENT_MESSAGE);
    }

    const department = await this.prisma.catDepartment.findFirst({
      where: { id: departmentId, deletedAt: null },
      select: { id: true },
    });
    if (!department) {
      throw new NotFoundException(DEPARTMENT_NOT_FOUND_MESSAGE);
    }

    if (!municipalityId) {
      return;
    }

    const municipality = await this.prisma.catMunicipality.findFirst({
      where: { id: municipalityId, deletedAt: null },
      select: { id: true, departmentId: true },
    });
    if (!municipality) {
      throw new NotFoundException(MUNICIPALITY_NOT_FOUND_MESSAGE);
    }

    if (municipality.departmentId !== departmentId) {
      throw new BadRequestException(MUNICIPALITY_DEPARTMENT_MISMATCH_MESSAGE);
    }
  }

  /**
   * Mirrors the schema's global `@unique` on `PeaceHouse.code`, which spans
   * every row regardless of `deletedAt` — same reasoning as
   * `assertNameIsUnique`.
   */
  private async assertCodeIsUnique(code: string | undefined, excludeId?: string): Promise<void> {
    if (!code) {
      return;
    }

    const existing = await this.prisma.peaceHouse.findFirst({
      where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_CODE_MESSAGE);
    }
  }

  private async assertDistrictExistsAndActive(districtId: string): Promise<void> {
    const district = await this.prisma.district.findFirst({
      where: { id: districtId, deletedAt: null },
    });

    if (!district) {
      throw new NotFoundException(DISTRICT_NOT_FOUND_MESSAGE);
    }

    if (district.status !== RecordStatus.ACTIVE) {
      throw new BadRequestException(DISTRICT_NOT_ACTIVE_MESSAGE);
    }
  }

  private async assertLeadershipUnitIsLeader(leadershipUnitId: string): Promise<void> {
    const unit = await this.prisma.leadershipUnit.findFirst({
      where: { id: leadershipUnitId, deletedAt: null },
      include: { role: true },
    });

    if (!unit) {
      throw new NotFoundException(LEADERSHIP_UNIT_NOT_FOUND_MESSAGE);
    }

    if (unit.role.name !== LEADER_LABEL) {
      throw new BadRequestException(LEADERSHIP_UNIT_WRONG_ROLE_MESSAGE);
    }
  }

  /**
   * RN-019: "Una Unidad de Liderazgo únicamente podrá administrar una Casa de Paz." Scoped
   * to non-soft-deleted rows only — a closed Casa's former Líder may lead a new one.
   */
  private async assertLeaderIsNotAlreadyLeadingAnother(
    leadershipUnitId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.peaceHouse.findFirst({
      where: {
        leadershipUnitId,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(LEADERSHIP_UNIT_ALREADY_LEADS_MESSAGE);
    }
  }

  /**
   * Mirrors `prisma/schema.prisma`'s `@@unique([districtId, name])`, which spans ALL rows
   * regardless of `deletedAt` — intentionally NOT filtered by `deletedAt: null`.
   */
  private async assertNameIsUnique(
    districtId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.peaceHouse.findFirst({
      where: { districtId, name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_NAME_MESSAGE);
    }
  }

  private async findActivePeaceHouseOrThrow(id: string): Promise<PeaceHouse> {
    const peaceHouse = await this.prisma.peaceHouse.findFirst({ where: { id, deletedAt: null } });

    if (!peaceHouse) {
      throw new NotFoundException(PEACE_HOUSE_NOT_FOUND_MESSAGE);
    }

    return peaceHouse;
  }

  private toResponse(peaceHouse: PeaceHouse): PeaceHouseResponseDto {
    return {
      id: peaceHouse.id,
      districtId: peaceHouse.districtId,
      leadershipUnitId: peaceHouse.leadershipUnitId,
      name: peaceHouse.name,
      code: peaceHouse.code,
      departmentId: peaceHouse.departmentId,
      municipalityId: peaceHouse.municipalityId,
      neighborhood: peaceHouse.neighborhood,
      address: peaceHouse.address,
      // Prisma returns `Decimal` for these columns; the API contract is JSON
      // numbers, and a coordinate's 6 decimals are far inside the range a
      // double represents exactly — so the conversion is lossless here.
      latitude: peaceHouse.latitude === null ? null : peaceHouse.latitude.toNumber(),
      longitude: peaceHouse.longitude === null ? null : peaceHouse.longitude.toNumber(),
      meetingDay: peaceHouse.meetingDay,
      meetingHour: peaceHouse.meetingHour,
      status: peaceHouse.status,
      createdAt: peaceHouse.createdAt,
      updatedAt: peaceHouse.updatedAt,
      createdBy: peaceHouse.createdBy,
      updatedBy: peaceHouse.updatedBy,
      version: peaceHouse.version,
    };
  }
}
