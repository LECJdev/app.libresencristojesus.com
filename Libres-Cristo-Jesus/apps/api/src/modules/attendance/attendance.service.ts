import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Meeting } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { AttendanceLockService } from './attendance-lock.service';
import { getIsoWeek, startOfIsoWeek } from './domain/iso-week';
import { dateForWeekdayInWeek, isoWeekdayFromName } from './domain/weekday';
import type {
  ChecklistResponseDto,
  ChecklistRowDto,
  MarkAllDto,
  MarkAttendanceDto,
  UnlockMeetingDto,
} from './dto/attendance.dto';

const PEACE_HOUSE_NOT_FOUND = 'La Casa de Paz no existe o fue eliminada';
const NO_ACTIVE_SCHEDULE =
  'La Casa de Paz no tiene una programación semanal activa. Configure el día y la hora de reunión antes de registrar asistencia.';
const UNREADABLE_DAY =
  'El día de reunión configurado no es un día de la semana válido. Corrija la programación de la Casa de Paz.';
const MEETING_NOT_FOUND = 'La reunión no existe o fue eliminada';
const PERSON_NOT_IN_ROSTER =
  'La persona no pertenece a esta Casa de Paz, por lo que no figura en la lista de asistencia';
const LOCKED_MESSAGE =
  'La asistencia de esta reunión está bloqueada porque la semana ya cerró. Solicite a su Pastor de Distrito que la reabra.';
const CANNOT_UNLOCK = 'Solo el Administrador y el Pastor de Distrito pueden reabrir una reunión';
const NOT_LOCKED = 'La reunión no está bloqueada, no hace falta reabrirla';

/**
 * Asistencia semanal — doc11 RN-407/RN-503/RN-504 y las reglas aprobadas
 * por el propietario del proyecto.
 *
 * Whether a sheet may be edited is NOT decided here: that is
 * `AttendanceLockService`, so the calendar rule lives in exactly one place
 * and this service only asks it.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: AttendanceLockService,
  ) {}

  /**
   * Returns this ISO week's meeting for a Casa de Paz, creating it on first
   * access (LAZY CREATION — approved rule 1: no cron).
   *
   * CONCURRENCY
   * Two leaders opening the module at the same second both find nothing and
   * both try to insert. The `@@unique([meetingScheduleId, isoYear, isoWeek])`
   * constraint lets exactly one win; the loser catches P2002 and re-reads
   * the row the winner created. That is why the constraint had to be in the
   * database — an application-level check would let both through.
   */
  async openCurrentMeeting(
    peaceHouseId: string,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<ChecklistResponseDto> {
    const schedule = await this.findActiveScheduleOrThrow(peaceHouseId);

    const isoWeekday = isoWeekdayFromName(schedule.meetingDay);
    if (isoWeekday === null) {
      throw new BadRequestException(UNREADABLE_DAY);
    }

    const { isoYear, isoWeek } = getIsoWeek(now);
    const meetingDate = dateForWeekdayInWeek(startOfIsoWeek(now), isoWeekday);

    const existing = await this.prisma.meeting.findFirst({
      where: { meetingScheduleId: schedule.id, isoYear, isoWeek, deletedAt: null },
    });

    const meeting =
      existing ?? (await this.createMeeting(schedule.id, meetingDate, isoYear, isoWeek, actor));

    return this.buildChecklist(meeting, peaceHouseId, actor, now);
  }

  /** The sheet of an existing meeting. */
  async getChecklist(
    meetingId: string,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<ChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    return this.buildChecklist(meeting, meeting.meetingSchedule.peaceHouseId, actor, now);
  }

  /** Marks one person present or absent. */
  async markAttendance(
    meetingId: string,
    personId: string,
    dto: MarkAttendanceDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<ChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    const peaceHouseId = meeting.meetingSchedule.peaceHouseId;
    const roster = await this.findRosterIds(peaceHouseId);

    if (!roster.has(personId)) {
      throw new BadRequestException(PERSON_NOT_IN_ROSTER);
    }

    await this.upsertAttendance(meetingId, personId, dto.present, dto.comments, actor, now);

    return this.buildChecklist(meeting, peaceHouseId, actor, now);
  }

  /**
   * "Marcar todos" / "desmarcar todos" — the same operation with a
   * different value.
   */
  async markAll(
    meetingId: string,
    dto: MarkAllDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<ChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    const peaceHouseId = meeting.meetingSchedule.peaceHouseId;
    const roster = await this.findRosterIds(peaceHouseId);

    // An explicit subset is intersected with the roster rather than trusted:
    // otherwise a caller could mark someone from another Casa de Paz.
    const targets = dto.personIds
      ? dto.personIds.filter((id) => roster.has(id))
      : Array.from(roster);

    await this.prisma.$transaction(async (tx) => {
      for (const personId of targets) {
        await this.upsertAttendance(meetingId, personId, dto.present, undefined, actor, now, tx);
      }
    });

    return this.buildChecklist(meeting, peaceHouseId, actor, now);
  }

  /**
   * Reopens a locked meeting for 7 calendar days (approved rule 3).
   *
   * Always a NEW row, never an update of a previous one: extending is a new
   * decision by a person at a point in time, and overwriting the earlier
   * record would erase the very trace RN-407 asks for.
   */
  async unlock(
    meetingId: string,
    dto: UnlockMeetingDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<ChecklistResponseDto> {
    if (!AttendanceLockService.canUnlock(actor.role)) {
      throw new ForbiddenException(CANNOT_UNLOCK);
    }

    const meeting = await this.findMeetingOrThrow(meetingId);

    // Reopening a meeting that is not locked would leave a misleading audit
    // entry suggesting an exception was needed.
    const leaderView: JwtPayload = { ...actor, role: RoleName.LEADER };
    const state = await this.lockService.getLockState(
      meetingId,
      meeting.meetingDate,
      leaderView,
      now,
    );
    if (state.editable) {
      throw new BadRequestException(NOT_LOCKED);
    }

    await this.prisma.meetingUnlock.create({
      data: {
        meetingId,
        unlockedBy: actor.sub,
        reason: dto.reason.trim(),
        unlockedAt: now,
        expiresAt: AttendanceLockService.expiryFrom(now),
      },
    });

    return this.buildChecklist(meeting, meeting.meetingSchedule.peaceHouseId, actor, now);
  }

  private async createMeeting(
    meetingScheduleId: string,
    meetingDate: Date,
    isoYear: number,
    isoWeek: number,
    actor: JwtPayload,
  ): Promise<Meeting> {
    try {
      return await this.prisma.meeting.create({
        data: { meetingScheduleId, meetingDate, isoYear, isoWeek, createdBy: actor.sub },
      });
    } catch (error) {
      // P2002 = unique violation: another request created it microseconds
      // ago. Re-reading is the correct outcome, not an error to surface.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.prisma.meeting.findFirst({
          where: { meetingScheduleId, isoYear, isoWeek },
        });
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  private async upsertAttendance(
    meetingId: string,
    personId: string,
    present: boolean,
    comments: string | undefined,
    actor: JwtPayload,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.attendance.upsert({
      where: { meetingId_personId: { meetingId, personId } },
      create: {
        meetingId,
        personId,
        present,
        comments: comments ?? null,
        // Only a present person has an arrival time.
        arrivalTime: present ? now : null,
        createdBy: actor.sub,
      },
      update: {
        present,
        comments: comments ?? undefined,
        arrivalTime: present ? now : null,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });
  }

  /** Ids of the people currently belonging to the Casa de Paz. */
  private async findRosterIds(peaceHouseId: string): Promise<Set<string>> {
    const memberships = await this.prisma.personPeaceHouseHistory.findMany({
      where: { peaceHouseId, endDate: null, deletedAt: null, person: { deletedAt: null } },
      select: { personId: true },
    });
    return new Set(memberships.map((membership) => membership.personId));
  }

  private async buildChecklist(
    meeting: Meeting,
    peaceHouseId: string,
    actor: JwtPayload,
    now: Date,
  ): Promise<ChecklistResponseDto> {
    const [memberships, attendances, lock] = await Promise.all([
      this.prisma.personPeaceHouseHistory.findMany({
        where: { peaceHouseId, endDate: null, deletedAt: null, person: { deletedAt: null } },
        select: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photo: true,
              personStage: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.attendance.findMany({
        where: { meetingId: meeting.id, deletedAt: null },
        select: { personId: true, present: true, comments: true },
      }),
      this.lockService.getLockState(meeting.id, meeting.meetingDate, actor, now),
    ]);

    const marked = new Map(attendances.map((row) => [row.personId, row]));

    const rows: ChecklistRowDto[] = memberships
      .map(({ person }) => {
        const record = marked.get(person.id);
        return {
          personId: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          photo: person.photo,
          // Nobody marked yet means absent, not unknown — the checklist is
          // exhaustive by construction.
          present: record?.present ?? false,
          comments: record?.comments ?? null,
          personStageName: person.personStage?.name ?? null,
        };
      })
      .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));

    return {
      meetingId: meeting.id,
      peaceHouseId,
      meetingDate: meeting.meetingDate,
      isoYear: meeting.isoYear,
      isoWeek: meeting.isoWeek,
      status: meeting.status,
      lock,
      rows,
      presentCount: rows.filter((row) => row.present).length,
    };
  }

  private async assertEditable(
    meeting: Meeting & { meetingSchedule: { peaceHouseId: string } },
    actor: JwtPayload,
    now: Date,
  ): Promise<void> {
    const state = await this.lockService.getLockState(meeting.id, meeting.meetingDate, actor, now);
    if (!state.editable) {
      throw new ForbiddenException(LOCKED_MESSAGE);
    }
  }

  /**
   * The active weekly schedule, seeded from the Casa de Paz on first use.
   *
   * WHY IT IS CREATED HERE RATHER THAN THROUGH ITS OWN CRUD
   * The Casa de Paz form already captures `meetingDay` and `meetingHour`;
   * asking an administrator to re-enter the same two values in a second
   * screen before a Líder can register anything would be friction with no
   * information gained. So the first access materialises the schedule from
   * the house.
   *
   * From that moment the two are INDEPENDENT (approved rule 3: changing the
   * schedule must not alter meetings already created). Editing the Casa de
   * Paz later does not rewrite this row — a dedicated schedule module can
   * take over its lifecycle without changing anything here.
   */
  private async findActiveScheduleOrThrow(peaceHouseId: string) {
    const peaceHouse = await this.prisma.peaceHouse.findFirst({
      where: { id: peaceHouseId, deletedAt: null },
      select: { id: true, meetingDay: true, meetingHour: true },
    });
    if (!peaceHouse) {
      throw new NotFoundException(PEACE_HOUSE_NOT_FOUND);
    }

    const existing = await this.prisma.meetingSchedule.findFirst({
      where: { peaceHouseId, active: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, meetingDay: true },
    });
    if (existing) {
      return existing;
    }

    // Nothing to seed from: the Casa de Paz has no schedule of its own.
    if (!peaceHouse.meetingDay) {
      throw new BadRequestException(NO_ACTIVE_SCHEDULE);
    }

    return this.prisma.meetingSchedule.create({
      data: {
        peaceHouseId,
        meetingDay: peaceHouse.meetingDay,
        meetingHour: peaceHouse.meetingHour ?? '19:00',
        active: true,
      },
      select: { id: true, meetingDay: true },
    });
  }

  private async findMeetingOrThrow(meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
      include: { meetingSchedule: { select: { peaceHouseId: true } } },
    });

    if (!meeting) {
      throw new NotFoundException(MEETING_NOT_FOUND);
    }

    return meeting;
  }
}
