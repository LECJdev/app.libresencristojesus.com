import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  RecordStatus,
  type CatRole,
  type Church,
  type LeadershipMember,
  type LeadershipUnit,
  type Prisma,
} from '@prisma/client';
import { ROLE_NAME_LABELS, RoleName, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreateOrganizationDto } from './dto/create-organization.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import type { OrganizationResponseDto } from './dto/organization-response.dto';
import type {
  OrganizationSearchQueryDto,
  OrganizationSearchResultDto,
} from './dto/organization-search.dto';
import type {
  DistrictNodeDto,
  LeadershipSummaryDto,
  OrganizationSummaryDto,
  OrganizationTreeDto,
} from './dto/organization-tree.dto';

const ORGANIZATION_NOT_FOUND_MESSAGE = 'Organization not found';
const VERSION_CONFLICT_MESSAGE =
  'The organization was modified by someone else — refresh and try again';
const ORGANIZATION_HAS_DISTRICTS_MESSAGE =
  'This organization has active districts and cannot be deleted — close or reassign every District first';

/** Columns `GET /organizations` may sort by — anything else falls back to `createdAt`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['name', 'status', 'createdAt', 'updatedAt']);

/** The exact Spanish `CatRole.name` of the general pastors (`packages/types/src/role.ts`). */
const GENERAL_PASTOR_LABEL = ROLE_NAME_LABELS[RoleName.GENERAL_PASTOR];

type LeadershipUnitWithDetails = LeadershipUnit & { role: CatRole; members: LeadershipMember[] };

function toLeadershipSummary(
  unit: LeadershipUnitWithDetails | null | undefined,
): LeadershipSummaryDto | null {
  if (!unit) {
    return null;
  }

  return {
    id: unit.id,
    role: unit.role.name,
    status: unit.status,
    photo: unit.photo,
    // `passwordHash` is on the entity and must never reach this shape — the
    // mapping is explicit field by field precisely so adding a column to the
    // table cannot silently publish it through the organigrama.
    members: unit.members.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      phone: member.phone,
      email: member.email,
      photo: member.photo,
    })),
  };
}

/**
 * The four cards of doc06 §6, computed from the tree already in memory
 * rather than with four more COUNT queries — and, more importantly, so the
 * totals always describe exactly the tree the caller received. A scoped
 * Pastor de Distrito seeing "48 Casas de Paz" above their own three would
 * be reporting someone else's numbers.
 */
function buildSummary(districts: DistrictNodeDto[]): OrganizationSummaryDto {
  const leaderships = new Set<string>();
  const municipalities = new Set<string>();
  let peaceHouses = 0;

  for (const district of districts) {
    if (district.leadership) {
      leaderships.add(district.leadership.id);
    }
    for (const peaceHouse of district.peaceHouses) {
      peaceHouses += 1;
      if (peaceHouse.leadership) {
        leaderships.add(peaceHouse.leadership.id);
      }
      if (peaceHouse.municipalityName) {
        municipalities.add(peaceHouse.municipalityName);
      }
    }
  }

  return {
    districts: districts.length,
    peaceHouses,
    leaderships: leaderships.size,
    municipalities: municipalities.size,
  };
}

/**
 * `Church` ("Organización") business logic — Fase 4. "Organización" in the
 * business language of `Documentos/06-modulo-organizacion.md` maps to the
 * `Church` table in `Documentos/04-modelo-de-datos.md` (there is no
 * `Organization` table). `Church` is the root of the `Church -> District ->
 * PeaceHouse` hierarchy (doc06 section 2), built ahead of a future
 * multi-church deployment — only one `Church` row exists today (see the
 * comment above `District.number` in `prisma/schema.prisma`).
 *
 * Style/error-handling precedent: `UsersService`/`PermissionsService` — same
 * standard NestJS exceptions, same soft-delete + optimistic-locking
 * convention. Users/Roles/Permissions are finished/verified modules this
 * phase must not touch or depend on.
 *
 * Design decisions:
 * - Who can manage the organization: doc06 section 21 ("Permisos") only says
 *   Administrador "Todo" and Pastores Generales "Administran toda la
 *   organización" — that reads naturally for `District`/`PeaceHouse`
 *   management (those modules' own future permission rules), but neither
 *   doc05 nor doc06 lists creating/editing the *Church row itself* as a
 *   capability of any role, because — per the `prisma/schema.prisma` comment
 *   above — only one Church exists and doc06's APIs (section 19) never
 *   include a Church CRUD endpoint at all. The closest doc05 capability match
 *   is Rol 1's "Configurar la plataforma"/"Gestionar parámetros del sistema",
 *   explicitly excluded from Rol 2 ("No puede: Modificar configuraciones
 *   técnicas del sistema"). Since `Church` carries the institution-wide
 *   branding/contact record (logo, colors, address, phone, email), this
 *   module treats create/update/delete as Administrador-exclusive
 *   (`prisma/seed.ts`'s `CHURCH_PERMISSIONS`), while list/read are granted to
 *   every role — doc06 section 4 ("Todos los usuarios autenticados podrán
 *   consultar el organigrama... Solo cambiarán las opciones de
 *   administración") and doc05's Matriz de Permisos ("Ver Organigrama" is ✅
 *   for all four roles).
 * - `remove(id)` (`DELETE /organizations/:id`) checks for active
 *   (non-soft-deleted) `District` rows FIRST and rejects with 409 if any
 *   exist — the same pattern `PermissionsService.remove` uses for active
 *   `RolePermission` grants. The FK (`District.churchId`, `onDelete:
 *   Restrict`) would block a *hard* delete anyway, but this check gives a
 *   clear 409 instead of a raw DB constraint error, and it also catches the
 *   soft-delete case the FK constraint alone can't: a soft-deleted `Church`
 *   with live `District` rows would leave those districts orphaned under an
 *   organization the API otherwise reports as "deleted" (`findOne`/`findAll`
 *   filter `deletedAt: null`).
 */
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, actor: JwtPayload): Promise<OrganizationResponseDto> {
    const church = await this.prisma.church.create({
      data: {
        name: dto.name,
        logo: dto.logo ?? null,
        description: dto.description ?? null,
        primaryColor: dto.primaryColor ?? null,
        secondaryColor: dto.secondaryColor ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        createdBy: actor.sub,
      },
    });

    return this.toResponse(church);
  }

  async findAll(
    query: ListOrganizationsQueryDto,
  ): Promise<{ data: OrganizationResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.ChurchWhereInput = {
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const orderBy = { [sortField]: query.order } as Prisma.ChurchOrderByWithRelationInput;

    const [total, churches] = await this.prisma.$transaction([
      this.prisma.church.count({ where }),
      this.prisma.church.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: churches.map((church) => this.toResponse(church)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<OrganizationResponseDto> {
    const church = await this.findActiveOrganizationOrThrow(id);
    return this.toResponse(church);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    actor: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    const church = await this.findActiveOrganizationOrThrow(id);

    if (church.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    const updated = await this.prisma.church.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        logo: dto.logo ?? undefined,
        description: dto.description ?? undefined,
        primaryColor: dto.primaryColor ?? undefined,
        secondaryColor: dto.secondaryColor ?? undefined,
        address: dto.address ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActiveOrganizationOrThrow(id);

    const activeDistricts = await this.prisma.district.count({
      where: { churchId: id, deletedAt: null },
    });
    if (activeDistricts > 0) {
      throw new ConflictException(ORGANIZATION_HAS_DISTRICTS_MESSAGE);
    }

    await this.prisma.church.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  private async findActiveOrganizationOrThrow(id: string): Promise<Church> {
    const church = await this.prisma.church.findFirst({ where: { id, deletedAt: null } });

    if (!church) {
      throw new NotFoundException(ORGANIZATION_NOT_FOUND_MESSAGE);
    }

    return church;
  }

  /**
   * Builds the Organigrama (doc06 §2/§4/§6/§7) in one query pass.
   *
   * VISIBILITY vs SCOPE — these are two different questions, and doc06 §4
   * settles the first one explicitly: "Todos los usuarios autenticados
   * podrán consultar el organigrama. No dependerá del rol." Every role gets
   * the whole tree here. doc05's Policies 1-4 (a Líder only *reaches* their
   * own Casa de Paz, a Pastor de Distrito only their own District) govern a
   * different thing — administering/opening a specific record, e.g.
   * `GET /peace-houses/:id`, not the read-only summary cards this endpoint
   * returns. Conflating the two used to narrow this tree by role, which
   * contradicted doc06 §4; `scoped` is kept in the response for API-shape
   * stability but is always `false` now.
   */
  async findTree(churchId: string | undefined, _actor: JwtPayload): Promise<OrganizationTreeDto> {
    const church = churchId
      ? await this.findActiveOrganizationOrThrow(churchId)
      : await this.findDefaultChurchOrThrow();
    churchId = church.id;

    const districts = await this.prisma.district.findMany({
      where: { churchId, deletedAt: null },
      orderBy: { number: 'asc' },
      include: {
        leadershipUnit: { include: { role: true, members: { where: { deletedAt: null } } } },
        peaceHouses: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          include: {
            department: { select: { name: true } },
            municipality: { select: { name: true } },
            leadershipUnit: { include: { role: true, members: { where: { deletedAt: null } } } },
          },
        },
      },
    });

    const generalPastorUnits = await this.prisma.leadershipUnit.findMany({
      where: { deletedAt: null, role: { name: GENERAL_PASTOR_LABEL } },
      include: { role: true, members: { where: { deletedAt: null } } },
    });

    const districtNodes = districts.map((district) => ({
      id: district.id,
      number: district.number,
      name: district.name,
      description: district.description,
      status: district.status,
      leadership: toLeadershipSummary(district.leadershipUnit),
      peaceHouseCount: district.peaceHouses.length,
      peaceHouses: district.peaceHouses.map((peaceHouse) => ({
        id: peaceHouse.id,
        name: peaceHouse.name,
        code: peaceHouse.code,
        status: peaceHouse.status,
        departmentName: peaceHouse.department?.name ?? null,
        municipalityName: peaceHouse.municipality?.name ?? null,
        neighborhood: peaceHouse.neighborhood,
        meetingDay: peaceHouse.meetingDay,
        meetingHour: peaceHouse.meetingHour,
        leadership: toLeadershipSummary(peaceHouse.leadershipUnit),
      })),
    }));

    return {
      id: church.id,
      name: church.name,
      logo: church.logo,
      description: church.description,
      status: church.status,
      generalPastors: generalPastorUnits
        .map((unit) => toLeadershipSummary(unit))
        .filter((unit): unit is LeadershipSummaryDto => unit !== null),
      summary: buildSummary(districtNodes),
      districts: districtNodes,
      scoped: false,
    };
  }

  /**
   * Global search across the organisational structure (doc06 §12).
   *
   * Never narrowed by role, for the same reason as `findTree`: doc06 §4
   * makes consulting the organigrama (which this search is part of)
   * independent of role. `scoped` is kept in the response for API-shape
   * stability but is always `false`.
   *
   * Every group is queried in parallel and capped independently, so one
   * very common term cannot let a single group crowd out the rest.
   */
  async search(
    query: OrganizationSearchQueryDto,
    _actor: JwtPayload,
  ): Promise<OrganizationSearchResultDto> {
    const term = query.q.trim();
    const contains = { contains: term, mode: 'insensitive' as const };
    const take = query.limit;

    const [districts, peaceHouses, leaderships, municipalities, departments] = await Promise.all([
      this.prisma.district.findMany({
        where: { deletedAt: null, OR: [{ name: contains }] },
        orderBy: { number: 'asc' },
        take,
      }),
      this.prisma.peaceHouse.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: contains },
            { code: contains },
            { neighborhood: contains },
            { address: contains },
          ],
        },
        orderBy: { name: 'asc' },
        take,
        include: {
          district: { select: { number: true, name: true } },
          municipality: { select: { name: true } },
        },
      }),
      // Couples are found by either member's username or name — doc06 §12
      // lists "Líder" and "Pastor" as searchable, and nobody searches for a
      // person by their account name, but the account name still doubles
      // as the closest thing to a couple's identifier before any member
      // has been registered.
      this.prisma.leadershipUnit.findMany({
        where: {
          deletedAt: null,
          OR: [
            { members: { some: { deletedAt: null, username: contains } } },
            { members: { some: { deletedAt: null, firstName: contains } } },
            { members: { some: { deletedAt: null, lastName: contains } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: { role: true, members: { where: { deletedAt: null } } },
      }),
      this.prisma.catMunicipality.findMany({
        where: { deletedAt: null, name: contains },
        orderBy: { name: 'asc' },
        take,
        include: { department: { select: { name: true } } },
      }),
      this.prisma.catDepartment.findMany({
        where: { deletedAt: null, name: contains },
        orderBy: { name: 'asc' },
        take,
      }),
    ]);

    const result: OrganizationSearchResultDto = {
      districts: districts.map((district) => ({
        id: district.id,
        title: `Distrito ${district.number} · ${district.name}`,
        subtitle: district.description,
        href: '/distritos',
      })),
      peaceHouses: peaceHouses.map((peaceHouse) => ({
        id: peaceHouse.id,
        title: peaceHouse.name,
        subtitle:
          [
            peaceHouse.code,
            peaceHouse.district ? `Distrito ${peaceHouse.district.number}` : null,
            peaceHouse.municipality?.name ?? null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
        href: '/casas-de-paz',
      })),
      leaderships: leaderships.map((unit) => ({
        id: unit.id,
        title:
          unit.members.length > 0
            ? unit.members
                .map((member) => `${member.firstName} ${member.lastName}`.trim())
                .join(' y ')
            : unit.role.name,
        subtitle: unit.role.name,
        // Only the Líder listing exists as a screen; the Pastores Generales
        // account has its own. Anything else has no page to link to yet,
        // and a link to nowhere is worse than none.
        href: this.leadershipHref(unit.role.name),
      })),
      municipalities: municipalities.map((municipality) => ({
        id: municipality.id,
        title: municipality.name,
        subtitle: municipality.department.name,
        href: null,
      })),
      departments: departments.map((department) => ({
        id: department.id,
        title: department.name,
        subtitle: null,
        href: null,
      })),
      total: 0,
      scoped: false,
    };

    result.total =
      result.districts.length +
      result.peaceHouses.length +
      result.leaderships.length +
      result.municipalities.length +
      result.departments.length;

    return result;
  }

  private leadershipHref(roleName: string): string | null {
    if (roleName === ROLE_NAME_LABELS[RoleName.LEADER]) {
      return '/lideres';
    }
    if (roleName === GENERAL_PASTOR_LABEL) {
      return '/pastores-generales';
    }
    return null;
  }

  /**
   * The single Church (doc06 module 1: "Debe existir una única Iglesia").
   *
   * Exists so the organigrama can be fetched without the client first
   * having to discover an id it cannot meaningfully choose — two round
   * trips for a value the server already knows. Ordered by `createdAt` so
   * the answer is deterministic if a second row ever appears; the
   * multi-church future the schema is prepared for will pass an explicit
   * `churchId` instead.
   */
  private async findDefaultChurchOrThrow(): Promise<Church> {
    const church = await this.prisma.church.findFirst({
      where: { deletedAt: null, status: RecordStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    if (!church) {
      throw new NotFoundException(ORGANIZATION_NOT_FOUND_MESSAGE);
    }

    return church;
  }

  private toResponse(church: Church): OrganizationResponseDto {
    return {
      id: church.id,
      name: church.name,
      logo: church.logo,
      description: church.description,
      primaryColor: church.primaryColor,
      secondaryColor: church.secondaryColor,
      address: church.address,
      phone: church.phone,
      email: church.email,
      status: church.status,
      createdAt: church.createdAt,
      updatedAt: church.updatedAt,
      createdBy: church.createdBy,
      updatedBy: church.updatedBy,
      version: church.version,
    };
  }
}
