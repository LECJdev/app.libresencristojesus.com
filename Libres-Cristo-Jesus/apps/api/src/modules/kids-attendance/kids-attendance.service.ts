import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KidsConsentStatus, Prisma, RecordStatus, type KidsMeeting } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { getIsoWeek } from '../attendance/domain/iso-week';
import type {
  KidsAttendanceTrendPointDto,
  KidsSchoolMetricsResponseDto,
} from './dto/kids-metrics.dto';
import type {
  KidsChecklistResponseDto,
  KidsChecklistRowDto,
  MarkAllKidsDto,
  MarkKidsAttendanceDto,
} from './dto/kids-attendance.dto';

const SCHOOL_NOT_FOUND_MESSAGE = 'KidsSchool not found';
const MEETING_NOT_FOUND_MESSAGE = 'KidsMeeting not found';
const CHILD_NOT_IN_ROSTER_MESSAGE =
  'The child does not belong to this KidsSchool, so it is not on this meeting roster';

/** How many past meetings feed `averageAttendance`/`attendanceTrend` (approved design left the exact N to this phase). */
const TREND_MEETING_COUNT = 8;
/** Window for "niños nuevos" (approved design left the exact window to this phase). */
const NEW_CHILDREN_WINDOW_DAYS = 30;

/**
 * `KidsMeeting`/`KidsAttendance` + métricas de sede — Fase 11, cuarta parte
 * ("Escuela Kids"). Mismo patrón que `AttendanceService` de Casas de Paz
 * (lazy creation, semana ISO, `@@unique` como protección de concurrencia),
 * pero SIN bloqueo semanal — no está en el alcance aprobado, no se replica.
 *
 * KIDS_LEADER y KIDS_ASSISTANT comparten acceso operativo idéntico acá,
 * igual que en `KidsChildrenService`.
 */
@Injectable()
export class KidsAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reunión de la semana ISO vigente para una sede, creándola en el primer
   * acceso (LAZY CREATION). El `@@unique([kidsSchoolId, isoYear, isoWeek])`
   * de la Fase 1 es la protección de concurrencia real.
   */
  async openCurrentMeeting(
    schoolId: string,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<KidsChecklistResponseDto> {
    await this.findActiveSchoolOrThrow(schoolId);

    const { isoYear, isoWeek } = getIsoWeek(now);

    const existing = await this.prisma.kidsMeeting.findFirst({
      where: { kidsSchoolId: schoolId, isoYear, isoWeek, deletedAt: null },
    });

    const meeting = existing ?? (await this.createMeeting(schoolId, isoYear, isoWeek, actor, now));

    return this.buildChecklist(meeting);
  }

  async getChecklist(meetingId: string): Promise<KidsChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    return this.buildChecklist(meeting);
  }

  async markAttendance(
    meetingId: string,
    childId: string,
    dto: MarkKidsAttendanceDto,
    actor: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    const roster = await this.findRosterIds(meeting.kidsSchoolId);

    if (!roster.has(childId)) {
      throw new BadRequestException(CHILD_NOT_IN_ROSTER_MESSAGE);
    }

    await this.upsertAttendance(meetingId, childId, dto.present, actor);

    return this.buildChecklist(meeting);
  }

  /** "Marcar todos" — mismo roster, siempre `present: true` (endpoint separado de `unmarkAll`, ya aprobado). */
  async markAll(
    meetingId: string,
    dto: MarkAllKidsDto,
    actor: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.markManyAndBuild(meetingId, dto, true, actor);
  }

  /** "Desmarcar todos" — `present: false`. */
  async unmarkAll(
    meetingId: string,
    dto: MarkAllKidsDto,
    actor: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.markManyAndBuild(meetingId, dto, false, actor);
  }

  /**
   * `GET /kids/schools/:schoolId/metrics`. `present`/`absent` leen la
   * reunión de la semana ISO vigente SI YA EXISTE — a diferencia de
   * `openCurrentMeeting`, este endpoint nunca la crea (la creación es
   * responsabilidad exclusiva del flujo de asistencia).
   */
  async getMetrics(schoolId: string, now: Date = new Date()): Promise<KidsSchoolMetricsResponseDto> {
    await this.findActiveSchoolOrThrow(schoolId);

    const { isoYear, isoWeek } = getIsoWeek(now);
    const newChildrenSince = new Date(now.getTime() - NEW_CHILDREN_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [totalChildren, inactiveChildren, pendingConsents, newChildren, currentMeeting] =
      await Promise.all([
        this.prisma.kidsChild.count({
          where: { kidsSchoolId: schoolId, status: RecordStatus.ACTIVE, deletedAt: null },
        }),
        this.prisma.kidsChild.count({
          where: { kidsSchoolId: schoolId, status: RecordStatus.INACTIVE, deletedAt: null },
        }),
        this.prisma.kidsChild.count({
          where: {
            kidsSchoolId: schoolId,
            deletedAt: null,
            consent: { status: KidsConsentStatus.PENDING_AUTHORIZATION },
          },
        }),
        this.prisma.kidsChild.count({
          where: { kidsSchoolId: schoolId, deletedAt: null, createdAt: { gte: newChildrenSince } },
        }),
        this.prisma.kidsMeeting.findFirst({
          where: { kidsSchoolId: schoolId, isoYear, isoWeek, deletedAt: null },
        }),
      ]);

    const present = currentMeeting
      ? await this.prisma.kidsAttendance.count({
          where: { kidsMeetingId: currentMeeting.id, present: true, deletedAt: null },
        })
      : 0;
    const absent = Math.max(totalChildren - present, 0);

    const { averageAttendance, attendanceTrend } = await this.buildTrend(schoolId, totalChildren);

    return {
      kidsSchoolId: schoolId,
      totalChildren,
      present,
      absent,
      averageAttendance,
      pendingConsents,
      newChildren,
      inactiveChildren,
      attendanceTrend,
    };
  }

  private async markManyAndBuild(
    meetingId: string,
    dto: MarkAllKidsDto,
    present: boolean,
    actor: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    const roster = await this.findRosterIds(meeting.kidsSchoolId);

    // Un subconjunto explícito se intersecta con el roster en vez de
    // confiarlo tal cual: si no, alguien podría marcar un niño de otra sede.
    const targets = dto.childIds ? dto.childIds.filter((id) => roster.has(id)) : Array.from(roster);

    await this.prisma.$transaction(async (tx) => {
      for (const childId of targets) {
        await this.upsertAttendance(meetingId, childId, present, actor, tx);
      }
    });

    return this.buildChecklist(meeting);
  }

  private async createMeeting(
    kidsSchoolId: string,
    isoYear: number,
    isoWeek: number,
    actor: JwtPayload,
    now: Date,
  ): Promise<KidsMeeting> {
    try {
      return await this.prisma.kidsMeeting.create({
        data: { kidsSchoolId, meetingDate: now, isoYear, isoWeek, createdBy: actor.sub },
      });
    } catch (error) {
      // P2002 = otro request creó la misma reunión microsegundos antes.
      // Releer es el resultado correcto, no un error a mostrar.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.prisma.kidsMeeting.findFirst({
          where: { kidsSchoolId, isoYear, isoWeek },
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
    childId: string,
    present: boolean,
    actor: JwtPayload,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.kidsAttendance.upsert({
      where: { kidsMeetingId_kidsChildId: { kidsMeetingId: meetingId, kidsChildId: childId } },
      create: { kidsMeetingId: meetingId, kidsChildId: childId, present, createdBy: actor.sub },
      update: { present, updatedBy: actor.sub, version: { increment: 1 } },
    });
  }

  /** Ids de los niños ACTIVE de la sede — el roster. */
  private async findRosterIds(kidsSchoolId: string): Promise<Set<string>> {
    const children = await this.prisma.kidsChild.findMany({
      where: { kidsSchoolId, status: RecordStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });
    return new Set(children.map((child) => child.id));
  }

  private async buildChecklist(meeting: KidsMeeting): Promise<KidsChecklistResponseDto> {
    const [children, attendances] = await Promise.all([
      this.prisma.kidsChild.findMany({
        where: { kidsSchoolId: meeting.kidsSchoolId, status: RecordStatus.ACTIVE, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, photo: true },
      }),
      this.prisma.kidsAttendance.findMany({
        where: { kidsMeetingId: meeting.id, deletedAt: null },
        select: { kidsChildId: true, present: true },
      }),
    ]);

    const marked = new Map(attendances.map((row) => [row.kidsChildId, row.present]));

    const rows: KidsChecklistRowDto[] = children
      .map((child) => ({
        childId: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        photo: child.photo,
        // Nadie marcó todavía significa ausente, no "desconocido" — el
        // checklist es exhaustivo por construcción (mismo criterio que
        // Casas de Paz).
        present: marked.get(child.id) ?? false,
      }))
      .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));

    return {
      meetingId: meeting.id,
      kidsSchoolId: meeting.kidsSchoolId,
      meetingDate: meeting.meetingDate,
      isoYear: meeting.isoYear,
      isoWeek: meeting.isoWeek,
      rows,
      presentCount: rows.filter((row) => row.present).length,
    };
  }

  /**
   * Trend cronológico (más antigua primero, como `DashboardService.trends`)
   * de las últimas `TREND_MEETING_COUNT` reuniones que existan. El
   * porcentaje de cada reunión pasada usa el `totalChildren` ACTUAL como
   * denominador — una aproximación deliberada: reconstruir el tamaño
   * histórico exacto del roster no está pedido y añadiría una complejidad
   * que esta fase no necesita.
   */
  private async buildTrend(
    kidsSchoolId: string,
    totalChildren: number,
  ): Promise<{ averageAttendance: number; attendanceTrend: KidsAttendanceTrendPointDto[] }> {
    const meetings = await this.prisma.kidsMeeting.findMany({
      where: { kidsSchoolId, deletedAt: null },
      orderBy: [{ isoYear: 'desc' }, { isoWeek: 'desc' }],
      take: TREND_MEETING_COUNT,
    });

    if (meetings.length === 0) {
      return { averageAttendance: 0, attendanceTrend: [] };
    }

    const chronological = [...meetings].reverse();

    const points = await Promise.all(
      chronological.map(async (meeting) => {
        const present = await this.prisma.kidsAttendance.count({
          where: { kidsMeetingId: meeting.id, present: true, deletedAt: null },
        });
        const attendancePercent =
          totalChildren === 0 ? 0 : Math.round((present / totalChildren) * 1000) / 10;

        return {
          isoYear: meeting.isoYear,
          isoWeek: meeting.isoWeek,
          label: `Sem ${meeting.isoWeek}`,
          attendancePercent,
        };
      }),
    );

    const averageAttendance =
      Math.round((points.reduce((sum, point) => sum + point.attendancePercent, 0) / points.length) * 10) /
      10;

    return { averageAttendance, attendanceTrend: points };
  }

  private async findActiveSchoolOrThrow(id: string): Promise<{ id: string }> {
    const school = await this.prisma.kidsSchool.findFirst({ where: { id, deletedAt: null } });
    if (!school) {
      throw new NotFoundException(SCHOOL_NOT_FOUND_MESSAGE);
    }
    return school;
  }

  private async findMeetingOrThrow(id: string): Promise<KidsMeeting> {
    const meeting = await this.prisma.kidsMeeting.findFirst({ where: { id, deletedAt: null } });
    if (!meeting) {
      throw new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    }
    return meeting;
  }
}
