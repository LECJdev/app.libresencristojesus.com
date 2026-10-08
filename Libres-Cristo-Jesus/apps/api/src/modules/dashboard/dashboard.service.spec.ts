import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { DashboardService } from './dashboard.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * WHAT THESE TESTS ARE REALLY PROTECTING
 *
 * A dashboard is the easiest place in a product to leak data, because an
 * aggregate looks harmless while quietly summing rows the caller may not
 * open. RN-1302 says every figure respects permissions, and the only way to
 * know it still does is to assert on the `where` clause that reaches the
 * database — a returned number tells you nothing about which rows produced
 * it.
 *
 * The date arithmetic is the other half: month and ISO-week boundaries are
 * where "+12 % vs mes anterior" silently becomes a lie.
 */
describe('DashboardService', () => {
  const admin: JwtPayload = {
    sub: 'admin-1',
    memberId: 'member-admin-1',
    username: 'admin',
    role: RoleName.ADMIN,
  };
  const generalPastor: JwtPayload = {
    sub: 'gp-1',
    memberId: 'gp-1-member',
    username: 'pastor-general',
    role: RoleName.GENERAL_PASTOR,
  };
  const districtPastor: JwtPayload = {
    sub: 'dp-1',
    memberId: 'dp-1-member',
    username: 'pastor-distrito',
    role: RoleName.DISTRICT_PASTOR,
  };
  const leader: JwtPayload = {
    sub: 'leader-1',
    memberId: 'member-leader-1',
    username: 'lider',
    role: RoleName.LEADER,
  };

  /** A Wednesday: 2026-07-29 is in ISO week 31 of 2026. */
  const now = new Date('2026-07-29T15:00:00.000Z');

  /**
   * Typed with its argument, not left as a bare `jest.Mock`: the loose form
   * makes every `mock.calls[...]` read an `any`, which this repo's lint
   * rules reject — correctly, since an assertion against `any` passes
   * whatever the code actually did, and these assertions ARE the test.
   */
  type QueryMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

  /** The argument a query was called with, narrowed by the caller. */
  const argOf = <T>(mock: QueryMock, index = 0): T => mock.mock.calls[index]?.[0] as T;

  /**
   * `jest.fn()` alone returns `Mock<any, any, any>`; spelling the generics
   * out is what keeps `mock.calls` typed all the way through.
   */
  const queryMock = (): QueryMock => jest.fn<Promise<unknown>, [Record<string, unknown>]>();

  /** Shape of a query that filters through a meeting. */
  interface MeetingScopedQuery {
    where: {
      present?: boolean;
      meeting: {
        meetingDate: { gte: Date; lte: Date };
        meetingSchedule: { peaceHouse: unknown };
      };
    };
    distinct?: string[];
  }

  let prisma: {
    attendance: { findMany: QueryMock };
    offering: { aggregate: QueryMock; findMany: QueryMock };
    peaceHouse: { count: QueryMock; findMany: QueryMock };
    meeting: { count: QueryMock };
  };
  let service: DashboardService;

  beforeEach(() => {
    prisma = {
      attendance: { findMany: queryMock().mockResolvedValue([]) },
      offering: {
        aggregate: queryMock().mockResolvedValue({ _sum: { amount: null } }),
        findMany: queryMock().mockResolvedValue([]),
      },
      peaceHouse: {
        count: queryMock().mockResolvedValue(0),
        findMany: queryMock().mockResolvedValue([]),
      },
      meeting: { count: queryMock().mockResolvedValue(0) },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  /** The scope fragment the nth attendance query carried. */
  const attendanceScope = (index = 0): unknown =>
    argOf<MeetingScopedQuery>(prisma.attendance.findMany, index).where.meeting.meetingSchedule
      .peaceHouse;

  describe('scope (RN-1302)', () => {
    it('does not restrict an Administrador', async () => {
      await service.summary(admin, now);

      expect(attendanceScope()).toEqual({});
    });

    it('does not restrict a Pastor General — doc05 gives them national reach', async () => {
      await service.summary(generalPastor, now);

      expect(attendanceScope()).toEqual({});
    });

    it('restricts a Líder to the Casas de Paz they lead (Policy 1)', async () => {
      await service.summary(leader, now);

      expect(attendanceScope()).toEqual({ leadershipUnitId: 'leader-1' });
    });

    it('restricts a Pastor de Distrito to their own district (Policy 2)', async () => {
      await service.summary(districtPastor, now);

      expect(attendanceScope()).toEqual({ district: { leadershipUnitId: 'dp-1' } });
    });

    it('carries the scope into the offerings aggregate too, not just attendance', async () => {
      await service.summary(leader, now);

      const call = argOf<MeetingScopedQuery>(prisma.offering.aggregate);
      expect(call.where.meeting.meetingSchedule.peaceHouse).toEqual({
        leadershipUnitId: 'leader-1',
      });
    });

    it('carries the scope into the map query', async () => {
      await service.mapStats(districtPastor);

      const call = argOf<{ where: Record<string, unknown> }>(prisma.peaceHouse.findMany);
      expect(call.where).toMatchObject({ district: { leadershipUnitId: 'dp-1' } });
    });
  });

  describe('date windows', () => {
    /** The date window the nth attendance query asked for. */
    const attendanceWindow = (index = 0): { gte: Date; lte: Date } =>
      argOf<MeetingScopedQuery>(prisma.attendance.findMany, index).where.meeting.meetingDate;

    it('asks for the calendar month in UTC, not a rolling 30 days', async () => {
      await service.summary(admin, now);

      const { gte, lte } = attendanceWindow();
      expect(gte.toISOString()).toBe('2026-07-01T00:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-07-31T23:59:59.999Z');
    });

    it('compares against the previous calendar month', async () => {
      await service.summary(admin, now);

      const { gte, lte } = attendanceWindow(1);
      expect(gte.toISOString()).toBe('2026-06-01T00:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-06-30T23:59:59.999Z');
    });

    it('handles a January reference by rolling back into the previous year', async () => {
      await service.summary(admin, new Date('2026-01-15T10:00:00.000Z'));

      const { gte, lte } = attendanceWindow(1);
      expect(gte.toISOString()).toBe('2025-12-01T00:00:00.000Z');
      expect(lte.toISOString()).toBe('2025-12-31T23:59:59.999Z');
    });

    it('handles February in a leap year without hardcoding month lengths', async () => {
      await service.summary(admin, new Date('2028-03-10T10:00:00.000Z'));

      expect(attendanceWindow(1).lte.toISOString()).toBe('2028-02-29T23:59:59.999Z');
    });

    it('counts meetings over the ISO week, Monday to Sunday', async () => {
      await service.summary(admin, now);

      const call = argOf<{ where: { meetingDate: { gte: Date; lte: Date } } }>(
        prisma.meeting.count,
      );
      // 2026-07-29 is a Wednesday; its ISO week starts Monday the 27th.
      expect(call.where.meetingDate.gte.toISOString()).toBe('2026-07-27T00:00:00.000Z');
    });
  });

  describe('attendee counting', () => {
    it('counts DISTINCT people so four meetings in a month is still one attendee', async () => {
      await service.summary(admin, now);

      expect(argOf<MeetingScopedQuery>(prisma.attendance.findMany).distinct).toEqual(['personId']);
    });

    it('counts only those actually present', async () => {
      await service.summary(admin, now);

      expect(argOf<MeetingScopedQuery>(prisma.attendance.findMany).where.present).toBe(true);
    });
  });

  describe('changePercent', () => {
    it('computes the variation against the previous period', async () => {
      prisma.attendance.findMany
        .mockResolvedValueOnce([{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }])
        .mockResolvedValueOnce([{ personId: 'a' }, { personId: 'b' }]);

      const result = await service.summary(admin, now);

      expect(result.attendees.current).toBe(3);
      expect(result.attendees.previous).toBe(2);
      expect(result.attendees.changePercent).toBe(50);
    });

    it('is NULL when the previous period was zero, never "+100 %" or Infinity', async () => {
      prisma.attendance.findMany
        .mockResolvedValueOnce([{ personId: 'a' }])
        .mockResolvedValueOnce([]);

      const result = await service.summary(admin, now);

      expect(result.attendees.current).toBe(1);
      expect(result.attendees.changePercent).toBeNull();
    });

    it('reports a negative variation when the figure fell', async () => {
      prisma.attendance.findMany
        .mockResolvedValueOnce([{ personId: 'a' }])
        .mockResolvedValueOnce([
          { personId: 'a' },
          { personId: 'b' },
          { personId: 'c' },
          { personId: 'd' },
        ]);

      const result = await service.summary(admin, now);

      expect(result.attendees.changePercent).toBe(-75);
    });
  });

  describe('trends', () => {
    it('emits every month in the window, including those with no data', async () => {
      const result = await service.trends(admin, 3, now);

      expect(result.months).toHaveLength(3);
      expect(result.months.map((m) => `${m.year}-${m.month}`)).toEqual([
        '2026-5',
        '2026-6',
        '2026-7',
      ]);
      expect(result.months.every((m) => m.attendance === 0 && m.offerings === 0)).toBe(true);
    });

    it('labels months in Spanish for the chart axis', async () => {
      const result = await service.trends(admin, 3, now);

      expect(result.months.map((m) => m.label)).toEqual(['May', 'Jun', 'Jul']);
    });

    it('buckets rows into the month of their MEETING, not of their registration', async () => {
      prisma.attendance.findMany.mockResolvedValueOnce([
        { meeting: { meetingDate: new Date('2026-06-11T00:00:00.000Z') } },
        { meeting: { meetingDate: new Date('2026-06-18T00:00:00.000Z') } },
        { meeting: { meetingDate: new Date('2026-07-02T00:00:00.000Z') } },
      ]);
      prisma.offering.findMany.mockResolvedValueOnce([
        {
          amount: new Prisma.Decimal('150000.50'),
          meeting: { meetingDate: new Date('2026-07-02T00:00:00.000Z') },
        },
      ]);

      const result = await service.trends(admin, 3, now);

      expect(result.months[1]).toMatchObject({ month: 6, attendance: 2, offerings: 0 });
      expect(result.months[2]).toMatchObject({ month: 7, attendance: 1, offerings: 150000.5 });
    });

    it('ignores rows that fall outside the requested window', async () => {
      prisma.attendance.findMany.mockResolvedValueOnce([
        { meeting: { meetingDate: new Date('2020-01-05T00:00:00.000Z') } },
      ]);

      const result = await service.trends(admin, 3, now);

      expect(result.months.every((m) => m.attendance === 0)).toBe(true);
    });
  });

  describe('mapStats', () => {
    const houseWithOwnPin = {
      id: 'house-1',
      name: 'Casa Esperanza',
      latitude: new Prisma.Decimal('4.710989'),
      longitude: new Prisma.Decimal('-74.072092'),
      municipality: { name: 'Bogotá', latitude: null, longitude: null },
      department: { name: 'Cundinamarca' },
      _count: { personHistory: 12 },
    };

    const houseWithoutPin = {
      id: 'house-2',
      name: 'Casa Betel',
      latitude: null,
      longitude: null,
      municipality: {
        name: 'Medellín',
        latitude: new Prisma.Decimal('6.244203'),
        longitude: new Prisma.Decimal('-75.581212'),
      },
      department: { name: 'Antioquia' },
      _count: { personHistory: 8 },
    };

    const houseNowhere = {
      id: 'house-3',
      name: 'Casa Sin Ubicar',
      latitude: null,
      longitude: null,
      municipality: { name: 'Pueblo', latitude: null, longitude: null },
      department: { name: 'Chocó' },
      _count: { personHistory: 4 },
    };

    it('uses the house own pin when it has one', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithOwnPin]);

      const result = await service.mapStats(admin);

      expect(result.points[0]).toMatchObject({
        id: 'house-1',
        latitude: 4.710989,
        longitude: -74.072092,
        count: 12,
        approximate: false,
        subLabel: 'Bogotá, Cundinamarca',
      });
    });

    it('falls back to the municipality centroid and flags it as approximate', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithoutPin]);

      const result = await service.mapStats(admin);

      expect(result.points[0]).toMatchObject({
        latitude: 6.244203,
        longitude: -75.581212,
        approximate: true,
      });
    });

    it('COUNTS unplottable houses instead of dropping them silently', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithOwnPin, houseNowhere]);

      const result = await service.mapStats(admin);

      expect(result.points).toHaveLength(1);
      expect(result.unlocated).toBe(1);
    });

    it('serves a second call from cache without querying again', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithOwnPin]);

      await service.mapStats(admin);
      await service.mapStats(admin);

      expect(prisma.peaceHouse.findMany).toHaveBeenCalledTimes(1);
    });

    it('NEVER serves one scope from another scope cache entry', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithOwnPin]);
      await service.mapStats(districtPastor);

      prisma.peaceHouse.findMany.mockResolvedValue([houseWithoutPin]);
      const other = await service.mapStats(leader);

      expect(prisma.peaceHouse.findMany).toHaveBeenCalledTimes(2);
      expect(other.points[0]?.id).toBe('house-2');
    });

    it('shares one cache entry between Administrador and Pastor General, who see the same country', async () => {
      prisma.peaceHouse.findMany.mockResolvedValue([houseWithOwnPin]);

      await service.mapStats(admin);
      await service.mapStats(generalPastor);

      expect(prisma.peaceHouse.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('scopeLabel', () => {
    it.each([
      [admin, 'Nacional'],
      [generalPastor, 'Nacional'],
      [districtPastor, 'Su distrito'],
      [leader, 'Su Casa de Paz'],
    ])('describes what the numbers cover for %s', async (actor, expected) => {
      const result = await service.summary(actor, now);
      expect(result.scopeLabel).toBe(expected);
    });
  });
});
