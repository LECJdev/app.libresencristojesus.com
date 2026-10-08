import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus, type Person, type Prisma } from '@prisma/client';
import { RoleName, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { TransferPersonDto, UpdatePersonDto } from './dto/update-person.dto';
import type { ListPeopleQueryDto } from './dto/list-people-query.dto';
import type {
  PersonAttendanceRateDto,
  PersonAttendanceRowDto,
  PersonHistoryResponseDto,
  PersonResponseDto,
} from './dto/person-response.dto';

const PERSON_NOT_FOUND_MESSAGE = 'Person not found';
const DUPLICATE_DOCUMENT_MESSAGE = 'Ya existe una persona registrada con este documento';
const STAGE_NOT_FOUND_MESSAGE = 'personStageId no corresponde a ninguna etapa';
const PEACE_HOUSE_NOT_FOUND_MESSAGE = 'peaceHouseId no corresponde a ninguna Casa de Paz activa';
const VERSION_CONFLICT_MESSAGE =
  'La persona fue modificada por alguien más — recargue e intente nuevamente';

/** Columns `GET /people` may sort by — anything else falls back to `lastName`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set([
  'firstName',
  'lastName',
  'document',
  'status',
  'createdAt',
  'updatedAt',
]);

/** `Person` with the relations every response needs resolved. */
type PersonWithRelations = Person & {
  personStage: { name: string } | null;
  peaceHouseHistory: { peaceHouseId: string }[];
};

/**
 * `Person` ("Personas") business logic — Fase 7 (doc04 §5).
 *
 * Style/error-handling precedent: `PeaceHousesService` — same standard
 * NestJS exceptions, same soft-delete and optimistic-locking conventions.
 *
 * DESIGN NOTES
 * - The person's CURRENT Casa de Paz is not a column: it is the
 *   `PersonPeaceHouseHistory` row whose `endDate` is null (see the model
 *   comment for why a nullable FK plus the table would be two sources of
 *   truth). Every read resolves it; every transfer closes one period and
 *   opens the next inside one transaction.
 * - `document` is unique when present. The pre-insert check exists to
 *   return a clean 409 instead of a raw constraint error, and — like every
 *   other uniqueness check in this codebase — it deliberately does NOT
 *   filter by `deletedAt`, because the database constraint does not either.
 */
@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePersonDto, actor: JwtPayload): Promise<PersonResponseDto> {
    await this.assertDocumentIsUnique(dto.document);
    await this.assertStageExists(dto.personStageId);
    await this.assertPeaceHouseExists(dto.peaceHouseId);

    const person = await this.prisma.$transaction(async (tx) => {
      const created = await tx.person.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          document: dto.document ?? null,
          gender: dto.gender ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          address: dto.address ?? null,
          photo: dto.photo ?? null,
          notes: dto.notes ?? null,
          personStageId: dto.personStageId ?? null,
          createdBy: actor.sub,
        },
      });

      // Opening the first history period here, in the same transaction,
      // is what keeps "since when has she belonged to this house" answerable
      // from day one (doc04 §5).
      if (dto.peaceHouseId) {
        await tx.personPeaceHouseHistory.create({
          data: {
            personId: created.id,
            peaceHouseId: dto.peaceHouseId,
            startDate: new Date(),
            reason: 'Registro inicial',
            createdBy: actor.sub,
          },
        });
      }

      return created;
    });

    return this.findOne(person.id);
  }

  async findAll(
    query: ListPeopleQueryDto,
    actor: JwtPayload,
  ): Promise<{ data: PersonResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.PersonWhereInput = {
      deletedAt: null,
      // A specific Casa de Paz is never scoped (doc06 §4 principle,
      // extended by explicit product decision): asking about ONE house's
      // roster is "viewing that house", same as opening its detail page.
      // Only the un-filtered listing — every person the caller can
      // otherwise see — stays narrowed, so this never becomes a backdoor
      // into the whole church's roster.
      ...(query.peaceHouseId ? {} : this.buildScopeFilter(actor)),
      ...(query.status ? { status: query.status } : {}),
      ...(query.personStageId ? { personStageId: query.personStageId } : {}),
      // "Belongs to this house" means an OPEN period — a person who left
      // last year must not show up in the current roster.
      ...(query.peaceHouseId
        ? {
            peaceHouseHistory: {
              some: { peaceHouseId: query.peaceHouseId, endDate: null, deletedAt: null },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { document: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'lastName';
    const orderBy = { [sortField]: query.order } as Prisma.PersonOrderByWithRelationInput;

    const [total, people] = await this.prisma.$transaction([
      this.prisma.person.count({ where }),
      this.prisma.person.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          personStage: { select: { name: true } },
          peaceHouseHistory: {
            where: { endDate: null, deletedAt: null },
            select: { peaceHouseId: true },
          },
        },
      }),
    ]);

    return {
      data: people.map((person) => this.toResponse(person)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async findOne(id: string): Promise<PersonResponseDto> {
    const person = await this.prisma.person.findFirst({
      where: { id, deletedAt: null },
      include: {
        personStage: { select: { name: true } },
        peaceHouseHistory: {
          where: { endDate: null, deletedAt: null },
          select: { peaceHouseId: true },
        },
      },
    });

    if (!person) {
      throw new NotFoundException(PERSON_NOT_FOUND_MESSAGE);
    }

    return this.toResponse(person);
  }

  /**
   * The pastoral process catalog (doc04 §3), ordered by its progression.
   *
   * Lives on this module rather than in a catalog of its own: it exists
   * solely to fill the stage selector of a Person form, and a whole module
   * for six read-only rows would be ceremony.
   */
  async findStages(): Promise<{ id: string; name: string; sortOrder: number }[]> {
    return this.prisma.catPersonStage.findMany({
      where: { status: RecordStatus.ACTIVE },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    });
  }

  /** Full membership timeline, newest period first (doc04 §5). */
  async findHistory(id: string): Promise<PersonHistoryResponseDto[]> {
    await this.findActivePersonOrThrow(id);

    const history = await this.prisma.personPeaceHouseHistory.findMany({
      where: { personId: id, deletedAt: null },
      orderBy: { startDate: 'desc' },
      include: { peaceHouse: { select: { name: true } } },
    });

    return history.map((entry) => ({
      id: entry.id,
      peaceHouseId: entry.peaceHouseId,
      peaceHouseName: entry.peaceHouse.name,
      startDate: entry.startDate,
      endDate: entry.endDate,
      reason: entry.reason,
      createdBy: entry.createdBy,
    }));
  }

  /**
   * Every meeting of the person's Casa de Paz since they joined it, with
   * whether they were present — exhaustive by construction, the same rule
   * `AttendanceService.buildChecklist` uses: a meeting nobody marked them at
   * is `present: false`, never omitted (doc11).
   */
  async findAttendance(id: string): Promise<PersonAttendanceRowDto[]> {
    await this.findActivePersonOrThrow(id);

    const membership = await this.prisma.personPeaceHouseHistory.findFirst({
      where: { personId: id, endDate: null, deletedAt: null },
      select: { peaceHouseId: true, startDate: true },
    });
    if (!membership) {
      return [];
    }

    const meetings = await this.prisma.meeting.findMany({
      where: {
        deletedAt: null,
        meetingDate: { gte: membership.startDate },
        meetingSchedule: { peaceHouseId: membership.peaceHouseId },
      },
      orderBy: { meetingDate: 'asc' },
      select: { id: true, meetingDate: true },
    });

    const presentRows = await this.prisma.attendance.findMany({
      where: {
        personId: id,
        present: true,
        deletedAt: null,
        meetingId: { in: meetings.map((meeting) => meeting.id) },
      },
      select: { meetingId: true },
    });
    const presentMeetingIds = new Set(presentRows.map((row) => row.meetingId));

    return meetings.map((meeting) => ({
      meetingDate: iso(meeting.meetingDate),
      present: presentMeetingIds.has(meeting.id),
    }));
  }

  /**
   * One attendance rate per active roster member of a Casa de Paz.
   *
   * Three queries total, never one per person: a Casa de Paz's roster is
   * small by design, but N+1 is N+1 regardless of how small N is.
   *
   * Never scoped: `peaceHouseId` is always one specific Casa de Paz here,
   * and viewing one house's rates is "viewing that house" — same principle
   * as its detail page, open to every role by explicit product decision.
   */
  async findAttendanceRates(
    peaceHouseId: string,
    _actor: JwtPayload,
  ): Promise<PersonAttendanceRateDto[]> {
    const roster = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        peaceHouseHistory: { some: { peaceHouseId, endDate: null, deletedAt: null } },
      },
      select: {
        id: true,
        peaceHouseHistory: {
          where: { peaceHouseId, endDate: null, deletedAt: null },
          take: 1,
          select: { startDate: true },
        },
      },
    });
    if (roster.length === 0) {
      return [];
    }

    const meetings = await this.prisma.meeting.findMany({
      where: { deletedAt: null, meetingSchedule: { peaceHouseId } },
      select: { id: true, meetingDate: true },
    });

    const presentRows = await this.prisma.attendance.findMany({
      where: {
        present: true,
        deletedAt: null,
        personId: { in: roster.map((person) => person.id) },
        meetingId: { in: meetings.map((meeting) => meeting.id) },
      },
      select: { personId: true },
    });
    const presentCountByPerson = new Map<string, number>();
    for (const row of presentRows) {
      presentCountByPerson.set(row.personId, (presentCountByPerson.get(row.personId) ?? 0) + 1);
    }

    return roster.map((person) => {
      const since = person.peaceHouseHistory[0]?.startDate;
      const total = since ? meetings.filter((meeting) => meeting.meetingDate >= since).length : 0;
      const present = presentCountByPerson.get(person.id) ?? 0;
      return {
        personId: person.id,
        rate: total === 0 ? null : Math.round((present / total) * 1000) / 10,
      };
    });
  }

  async update(id: string, dto: UpdatePersonDto, actor: JwtPayload): Promise<PersonResponseDto> {
    const person = await this.findActivePersonOrThrow(id);

    if (person.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    if (dto.document !== undefined && dto.document !== person.document) {
      await this.assertDocumentIsUnique(dto.document, id);
    }
    await this.assertStageExists(dto.personStageId);

    await this.prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id },
        data: {
          firstName: dto.firstName?.trim() ?? undefined,
          lastName: dto.lastName?.trim() ?? undefined,
          document: dto.document ?? undefined,
          gender: dto.gender ?? undefined,
          phone: dto.phone ?? undefined,
          email: dto.email ?? undefined,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          address: dto.address ?? undefined,
          photo: dto.photo ?? undefined,
          notes: dto.notes ?? undefined,
          personStageId: dto.personStageId ?? undefined,
          status: dto.status ?? undefined,
          updatedBy: actor.sub,
          version: { increment: 1 },
        },
      });

      if (dto.peaceHouseId) {
        await this.applyTransfer(tx, id, dto.peaceHouseId, dto.transferReason, actor);
      }
    });

    return this.findOne(id);
  }

  /** Moves a person to another Casa de Paz, preserving the full timeline. */
  async transfer(
    id: string,
    dto: TransferPersonDto,
    actor: JwtPayload,
  ): Promise<PersonResponseDto> {
    await this.findActivePersonOrThrow(id);
    await this.assertPeaceHouseExists(dto.peaceHouseId);

    await this.prisma.$transaction(async (tx) => {
      await this.applyTransfer(tx, id, dto.peaceHouseId, dto.transferReason, actor);
    });

    return this.findOne(id);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findActivePersonOrThrow(id);

    // Soft delete only (doc04 §13). The history is NOT closed: a person who
    // leaves the system did not stop having belonged to their house, and
    // rewriting that would corrupt every past attendance report.
    await this.prisma.person.update({
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
   * Narrows the UN-FILTERED listing to what the caller administers (doc05
   * Policies 1-2). Only applies when `findAll` gets no `peaceHouseId` —
   * asking about one specific Casa de Paz is never scoped (see the call
   * site), by the same explicit product decision that opened
   * `GET /people/:id` and `GET /peace-houses/:id`. This filter exists so
   * the general "every person I can see" listing does not become a
   * backdoor into the whole church's roster.
   */
  private buildScopeFilter(actor: JwtPayload): Prisma.PersonWhereInput {
    if (actor.role === RoleName.ADMIN || actor.role === RoleName.GENERAL_PASTOR) {
      return {};
    }

    const openMembership = { endDate: null, deletedAt: null };

    if (actor.role === RoleName.LEADER) {
      return {
        peaceHouseHistory: {
          some: { ...openMembership, peaceHouse: { leadershipUnitId: actor.sub } },
        },
      };
    }

    // DISTRICT_PASTOR: everyone in any Casa de Paz of their district.
    return {
      peaceHouseHistory: {
        some: {
          ...openMembership,
          peaceHouse: { district: { leadershipUnitId: actor.sub } },
        },
      },
    };
  }

  /**
   * Closes the open membership period and opens a new one.
   *
   * A no-op when the person is already in that house: re-saving a form
   * without touching the Casa de Paz must not manufacture a transfer that
   * never happened.
   */
  private async applyTransfer(
    tx: Prisma.TransactionClient,
    personId: string,
    peaceHouseId: string,
    reason: string | undefined,
    actor: JwtPayload,
  ): Promise<void> {
    const current = await tx.personPeaceHouseHistory.findFirst({
      where: { personId, endDate: null, deletedAt: null },
      select: { id: true, peaceHouseId: true },
    });

    if (current?.peaceHouseId === peaceHouseId) {
      return;
    }

    const now = new Date();

    if (current) {
      await tx.personPeaceHouseHistory.update({
        where: { id: current.id },
        data: { endDate: now, updatedBy: actor.sub },
      });
    }

    await tx.personPeaceHouseHistory.create({
      data: {
        personId,
        peaceHouseId,
        startDate: now,
        reason: reason ?? 'Traslado de Casa de Paz',
        createdBy: actor.sub,
      },
    });
  }

  private async assertDocumentIsUnique(
    document: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    if (!document) {
      return;
    }

    const existing = await this.prisma.person.findFirst({
      where: { document, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_DOCUMENT_MESSAGE);
    }
  }

  private async assertStageExists(personStageId: string | undefined): Promise<void> {
    if (!personStageId) {
      return;
    }

    const stage = await this.prisma.catPersonStage.findFirst({
      where: { id: personStageId, status: RecordStatus.ACTIVE },
      select: { id: true },
    });

    if (!stage) {
      throw new BadRequestException(STAGE_NOT_FOUND_MESSAGE);
    }
  }

  private async assertPeaceHouseExists(peaceHouseId: string | undefined): Promise<void> {
    if (!peaceHouseId) {
      return;
    }

    const peaceHouse = await this.prisma.peaceHouse.findFirst({
      where: { id: peaceHouseId, deletedAt: null },
      select: { id: true },
    });

    if (!peaceHouse) {
      throw new NotFoundException(PEACE_HOUSE_NOT_FOUND_MESSAGE);
    }
  }

  private async findActivePersonOrThrow(id: string): Promise<Person> {
    const person = await this.prisma.person.findFirst({ where: { id, deletedAt: null } });

    if (!person) {
      throw new NotFoundException(PERSON_NOT_FOUND_MESSAGE);
    }

    return person;
  }

  private toResponse(person: PersonWithRelations): PersonResponseDto {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      document: person.document,
      gender: person.gender,
      phone: person.phone,
      email: person.email,
      birthDate: person.birthDate,
      address: person.address,
      photo: person.photo,
      notes: person.notes,
      personStageId: person.personStageId,
      personStageName: person.personStage?.name ?? null,
      currentPeaceHouseId: person.peaceHouseHistory[0]?.peaceHouseId ?? null,
      status: person.status,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      createdBy: person.createdBy,
      updatedBy: person.updatedBy,
      version: person.version,
    };
  }
}

/** `YYYY-MM-DD` — the date without the instant, which is all attendance shows. */
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
