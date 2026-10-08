import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { peaceHouseScopeFilter, peaceHouseScopeKey } from '../../common/security/peace-house-scope';
import { startOfIsoWeek } from '../attendance/domain/iso-week';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type {
  DashboardKpiDto,
  DashboardSummaryDto,
  DashboardTrendPointDto,
  DashboardTrendsDto,
  MapPointDto,
  MapStatsDto,
} from './dto/dashboard.dto';

/**
 * How long a computed map stays warm. The underlying figures move when a
 * Casa de Paz is created or a person is registered — neither is a
 * by-the-second event, and recomputing a national aggregate on every pan of
 * the map would be absurd.
 */
const MAP_CACHE_TTL_MS = 15 * 60 * 1000;

/** Short Spanish month labels for the chart axis (doc18: UI copy in Spanish). */
const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

interface CacheEntry {
  value: MapStatsDto;
  expiresAt: number;
}

/**
 * Los indicadores del Dashboard (doc11 RN-1301/RN-1302).
 *
 * RN-1301: every figure is COMPUTED, never stored and never typed in.
 * RN-1302: every figure RESPECTS PERMISSIONS. That is not decoration — a
 * dashboard is the easiest place in a product to leak, because an aggregate
 * looks harmless while quietly summing rows the caller may not open. Every
 * query here starts from `peaceHouseScopeFilter`, the same rule `ScopeGuard`
 * applies to a single row.
 *
 * EVERYTHING IS AGGREGATED IN THE DATABASE. Reading rows into memory to
 * count them would work at demo scale and fall over the first time a
 * national total spans years of attendance.
 */
@Injectable()
export class DashboardService {
  /**
   * Keyed by SCOPE, never global. A single shared entry would serve one
   * district's map to another district's pastor — a data leak dressed up as
   * a performance optimisation.
   */
  private readonly mapCache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: JwtPayload, now: Date = new Date()): Promise<DashboardSummaryDto> {
    const scope = peaceHouseScopeFilter(actor);

    const currentMonth = monthRange(now, 0);
    const previousMonth = monthRange(now, -1);
    const currentWeek = weekRange(now, 0);
    const previousWeek = weekRange(now, -1);

    const [
      attendeesCurrent,
      attendeesPrevious,
      offeringsCurrent,
      offeringsPrevious,
      housesCurrent,
      housesPrevious,
      meetingsCurrent,
      meetingsPrevious,
    ] = await Promise.all([
      this.countAttendees(scope, currentMonth),
      this.countAttendees(scope, previousMonth),
      this.sumOfferings(scope, currentMonth),
      this.sumOfferings(scope, previousMonth),
      this.countActivePeaceHouses(scope),
      this.countActivePeaceHouses(scope, previousMonth.end),
      this.countMeetings(scope, currentWeek),
      this.countMeetings(scope, previousWeek),
    ]);

    return {
      attendees: toKpi(attendeesCurrent, attendeesPrevious),
      offerings: toKpi(offeringsCurrent, offeringsPrevious),
      activePeaceHouses: toKpi(housesCurrent, housesPrevious),
      meetingsThisWeek: toKpi(meetingsCurrent, meetingsPrevious),
      scopeLabel: scopeLabelFor(actor.role),
    };
  }

  /**
   * The two monthly series behind the dashboard's charts.
   *
   * MONTHS WITH NO DATA ARE EMITTED AS ZERO, deliberately — unlike the
   * offerings average, which treats an unreported week as missing data. The
   * difference is the question being asked: an average is a claim about
   * typical behaviour and must not be dragged down by a form nobody filled,
   * while a time series is a picture of what happened, and a month silently
   * missing from the axis makes a chart lie about its own shape.
   */
  async trends(
    actor: JwtPayload,
    months: number,
    now: Date = new Date(),
  ): Promise<DashboardTrendsDto> {
    const scope = peaceHouseScopeFilter(actor);
    const window = { start: monthRange(now, -(months - 1)).start, end: monthRange(now, 0).end };

    const [attendances, offerings] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          deletedAt: null,
          present: true,
          meeting: this.meetingFilter(scope, window),
        },
        select: { meeting: { select: { meetingDate: true } } },
      }),
      this.prisma.offering.findMany({
        where: { deletedAt: null, meeting: this.meetingFilter(scope, window) },
        select: { amount: true, meeting: { select: { meetingDate: true } } },
      }),
    ]);

    const buckets = new Map<string, DashboardTrendPointDto>();
    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const { start } = monthRange(now, -offset);
      const year = start.getUTCFullYear();
      const month = start.getUTCMonth() + 1;
      buckets.set(monthKey(year, month), {
        year,
        month,
        label: MONTH_LABELS[month - 1]!,
        attendance: 0,
        offerings: 0,
      });
    }

    for (const row of attendances) {
      const bucket = buckets.get(keyOfDate(row.meeting.meetingDate));
      if (bucket) {
        bucket.attendance += 1;
      }
    }

    for (const row of offerings) {
      const bucket = buckets.get(keyOfDate(row.meeting.meetingDate));
      if (bucket) {
        bucket.offerings += row.amount.toNumber();
      }
    }

    return { months: Array.from(buckets.values()) };
  }

  /**
   * Every Casa de Paz the caller may see, positioned for the map.
   *
   * A house is plotted on ITS OWN PIN when it has one, and on its
   * municipality's centroid when it does not. Houses with neither are
   * counted in `unlocated` rather than dropped in silence: a map that shows
   * eleven of twenty houses and says nothing about the other nine invites
   * exactly the wrong conclusion.
   *
   * NEVER GEOCODES. Coordinates come from `pnpm db:geocode:geo`, run once by
   * an operator. Nominatim allows one call per second and blocks callers who
   * exceed it; reaching it from a request would put a throttled third party
   * in the path of a page a user is waiting on.
   */
  async mapStats(actor: JwtPayload): Promise<MapStatsDto> {
    const cacheKey = peaceHouseScopeKey(actor);
    const cached = this.mapCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const houses = await this.prisma.peaceHouse.findMany({
      where: { deletedAt: null, status: 'ACTIVE', ...peaceHouseScopeFilter(actor) },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        municipality: {
          select: { name: true, latitude: true, longitude: true },
        },
        department: { select: { name: true } },
        _count: {
          select: { personHistory: { where: { endDate: null, deletedAt: null } } },
        },
      },
    });

    const points: MapPointDto[] = [];
    let unlocated = 0;

    for (const house of houses) {
      const ownPin =
        house.latitude !== null && house.longitude !== null
          ? { latitude: house.latitude.toNumber(), longitude: house.longitude.toNumber() }
          : null;

      const fallback =
        house.municipality?.latitude != null && house.municipality.longitude != null
          ? {
              latitude: house.municipality.latitude.toNumber(),
              longitude: house.municipality.longitude.toNumber(),
            }
          : null;

      const position = ownPin ?? fallback;
      if (!position) {
        unlocated += 1;
        continue;
      }

      points.push({
        id: house.id,
        label: house.name,
        subLabel: describePlace(house.municipality?.name, house.department?.name),
        count: house._count.personHistory,
        latitude: position.latitude,
        longitude: position.longitude,
        approximate: ownPin === null,
      });
    }

    const value: MapStatsDto = { points, unlocated };
    this.mapCache.set(cacheKey, { value, expiresAt: Date.now() + MAP_CACHE_TTL_MS });
    return value;
  }

  /**
   * DISTINCT people, not attendance rows: someone present at four meetings
   * in a month is one attendee, and counting them four times would inflate
   * the headline figure of the whole product.
   */
  private async countAttendees(
    scope: Prisma.PeaceHouseWhereInput,
    range: DateRange,
  ): Promise<number> {
    const rows = await this.prisma.attendance.findMany({
      where: { deletedAt: null, present: true, meeting: this.meetingFilter(scope, range) },
      select: { personId: true },
      distinct: ['personId'],
    });
    return rows.length;
  }

  private async sumOfferings(
    scope: Prisma.PeaceHouseWhereInput,
    range: DateRange,
  ): Promise<number> {
    const aggregate = await this.prisma.offering.aggregate({
      where: { deletedAt: null, meeting: this.meetingFilter(scope, range) },
      _sum: { amount: true },
    });
    return aggregate._sum.amount?.toNumber() ?? 0;
  }

  /**
   * `asOf` reconstructs the count at a past instant from `createdAt`, which
   * is the honest way to compare "active houses" month over month: the row
   * itself only knows today's status.
   */
  private countActivePeaceHouses(scope: Prisma.PeaceHouseWhereInput, asOf?: Date): Promise<number> {
    return this.prisma.peaceHouse.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...scope,
        ...(asOf ? { createdAt: { lte: asOf } } : {}),
      },
    });
  }

  private countMeetings(scope: Prisma.PeaceHouseWhereInput, range: DateRange): Promise<number> {
    return this.prisma.meeting.count({ where: this.meetingFilter(scope, range) });
  }

  /** The one place scope and date window are combined, so they cannot drift. */
  private meetingFilter(
    scope: Prisma.PeaceHouseWhereInput,
    range: DateRange,
  ): Prisma.MeetingWhereInput {
    return {
      deletedAt: null,
      meetingDate: { gte: range.start, lte: range.end },
      meetingSchedule: { peaceHouse: scope },
    };
  }
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * A whole month in UTC, `offset` months from the reference date.
 *
 * UTC throughout, matching how `meetingDate` is stored. Mixing a local-time
 * boundary with a UTC column moves every meeting near midnight into the
 * wrong month, and Colombia's -05:00 makes that a five-hour window on every
 * single boundary — not a rare edge case.
 */
function monthRange(reference: Date, offset: number): DateRange {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + offset;
  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    // Day 0 of the NEXT month is the last day of this one, which sidesteps
    // having to know about 28/29/30/31 or leap years.
    end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

/** The ISO week containing the reference date, `offset` weeks away. */
function weekRange(reference: Date, offset: number): DateRange {
  const shifted = new Date(reference.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
  const start = startOfIsoWeek(shifted);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function keyOfDate(date: Date): string {
  return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

/**
 * `changePercent` is null when the previous period was zero.
 *
 * Growing from nothing has no percentage. Reporting "+100 %" would be
 * arbitrary and "∞" is not a figure anyone can act on — the screen says
 * "sin comparativo" instead, which is the truth.
 */
function toKpi(current: number, previous: number): DashboardKpiDto {
  const changePercent =
    previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
  return { current, previous, changePercent };
}

function scopeLabelFor(role: RoleName): string {
  switch (role) {
    case RoleName.ADMIN:
    case RoleName.GENERAL_PASTOR:
      return 'Nacional';
    case RoleName.DISTRICT_PASTOR:
      return 'Su distrito';
    default:
      return 'Su Casa de Paz';
  }
}

function describePlace(municipality?: string, department?: string): string | null {
  const parts = [municipality, department].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
