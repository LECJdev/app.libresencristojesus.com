import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { OfferingsService } from './offerings.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { ListOfferingsQueryDto } from './dto/list-offerings-query.dto';

const admin: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};
const generalPastor: JwtPayload = {
  sub: 'unit-general',
  memberId: 'member-general',
  username: 'general',
  role: RoleName.GENERAL_PASTOR,
};
const districtPastor: JwtPayload = {
  sub: 'unit-pastor',
  memberId: 'member-pastor',
  username: 'pastor',
  role: RoleName.DISTRICT_PASTOR,
};
const leader: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'lider',
  role: RoleName.LEADER,
};

function query(overrides: Partial<ListOfferingsQueryDto> = {}): ListOfferingsQueryDto {
  return { page: 1, pageSize: 20, order: 'asc', ...overrides };
}

function buildRow(amount: string, isoWeek = 31) {
  return {
    id: `offering-${amount}`,
    meetingId: 'meeting-1',
    amount: new Prisma.Decimal(amount),
    notes: null,
    meeting: {
      id: 'meeting-1',
      meetingDate: new Date('2026-07-30T00:00:00Z'),
      isoYear: 2026,
      isoWeek,
      meetingSchedule: { peaceHouseId: 'house-1', peaceHouse: { name: 'Casa Esperanza' } },
    },
  };
}

/** Reaches into the `where` the service built for the house filter. */
function peaceHouseFilter(where: Prisma.OfferingWhereInput): Record<string, unknown> {
  const meeting = where.meeting as { meetingSchedule?: { peaceHouse?: Record<string, unknown> } };
  return meeting.meetingSchedule?.peaceHouse ?? {};
}

describe('OfferingsService', () => {
  let prisma: {
    offering: { findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OfferingsService;

  beforeEach(() => {
    prisma = {
      offering: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: null },
          _avg: { amount: null },
          _min: { amount: null },
          _max: { amount: null },
          _count: 0,
        }),
      },
      $transaction: jest.fn((arg: unknown) => Promise.all(arg as Promise<unknown>[])),
    };

    service = new OfferingsService(prisma as unknown as PrismaService);
  });

  /**
   * The half `ScopeGuard` cannot cover: a list has no single resource id,
   * so the narrowing must happen in the `where` clause. Filtering after the
   * query would mean the rows were already read — that is the leak.
   */
  describe('Alcance por fila', () => {
    it('does not narrow anything for an Administrador', async () => {
      await service.findAll(query(), admin);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      expect(peaceHouseFilter(args.where)).toEqual({});
    });

    it('does not narrow anything for a Pastor General', async () => {
      // doc05 Rol 2: "Visualizar todas las ofrendas".
      await service.findAll(query(), generalPastor);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      expect(peaceHouseFilter(args.where)).toEqual({});
    });

    it('narrows a Líder to the Casa de Paz they lead', async () => {
      await service.findAll(query(), leader);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      expect(peaceHouseFilter(args.where)).toEqual({ leadershipUnitId: leader.sub });
    });

    it('narrows a Pastor de Distrito to the houses of their own district', async () => {
      await service.findAll(query(), districtPastor);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      expect(peaceHouseFilter(args.where)).toEqual({
        district: { leadershipUnitId: districtPastor.sub },
      });
    });

    it('applies the same scope to the summary as to the list', async () => {
      // If they diverged, a Líder could read a total covering houses whose
      // rows the list refuses to show them.
      await service.summary(query(), leader);

      const [args] = prisma.offering.aggregate.mock.calls[0]! as [
        { where: Prisma.OfferingWhereInput },
      ];
      expect(peaceHouseFilter(args.where)).toEqual({ leadershipUnitId: leader.sub });
    });
  });

  describe('findAll', () => {
    it('excludes soft-deleted offerings and soft-deleted meetings', async () => {
      await service.findAll(query(), admin);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      expect(args.where.deletedAt).toBeNull();
      expect((args.where.meeting as { deletedAt?: unknown }).deletedAt).toBeNull();
    });

    it('filters by the MEETING date, not by when the offering was typed in', async () => {
      await service.findAll(query({ from: '2026-07-01', to: '2026-07-31' }), admin);

      const [args] = prisma.offering.count.mock.calls[0]! as [{ where: Prisma.OfferingWhereInput }];
      const meeting = args.where.meeting as { meetingDate?: { gte?: Date; lte?: Date } };
      // A leader reporting on Tuesday for last Thursday belongs in last
      // Thursday's figures, or every monthly total is wrong at the edges.
      expect(meeting.meetingDate?.gte).toEqual(new Date('2026-07-01'));
      expect(meeting.meetingDate?.lte).toEqual(new Date('2026-07-31'));
    });

    it('orders by the newest meeting first by default', async () => {
      await service.findAll(query(), admin);

      const [args] = prisma.offering.findMany.mock.calls[0]! as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual({ meeting: { meetingDate: 'desc' } });
    });

    it('sorts by meetingDate through the relation when asked', async () => {
      await service.findAll(query({ sort: 'meetingDate', order: 'asc' }), admin);

      const [args] = prisma.offering.findMany.mock.calls[0]! as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual({ meeting: { meetingDate: 'asc' } });
    });

    it('ignores an unknown sort column instead of passing it through', async () => {
      await service.findAll(query({ sort: 'passwordHash' }), admin);

      const [args] = prisma.offering.findMany.mock.calls[0]! as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual({ meeting: { meetingDate: 'desc' } });
    });

    it('flattens the Casa de Paz onto each row and converts the amount', async () => {
      prisma.offering.findMany.mockResolvedValue([buildRow('250000.00')]);

      const result = await service.findAll(query(), admin);

      expect(result.data[0]).toMatchObject({
        peaceHouseId: 'house-1',
        peaceHouseName: 'Casa Esperanza',
        amount: 250000,
        isoWeek: 31,
      });
    });
  });

  describe('summary', () => {
    it('returns zeros rather than nulls when there is nothing to add up', async () => {
      const result = await service.summary(query(), admin);

      expect(result).toMatchObject({ total: 0, count: 0, average: 0, min: null, max: null });
      expect(result.byWeek).toEqual([]);
    });

    it('aggregates in the database, over the whole filter', async () => {
      prisma.offering.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal('525500.50') },
        _avg: { amount: new Prisma.Decimal('262750.25') },
        _min: { amount: new Prisma.Decimal('250000') },
        _max: { amount: new Prisma.Decimal('275500.50') },
        _count: 2,
      });

      const result = await service.summary(query(), admin);

      // Summing the twenty rows currently on screen would be a lie that
      // looks like a statistic.
      expect(result).toMatchObject({
        total: 525500.5,
        count: 2,
        average: 262750.25,
        min: 250000,
        max: 275500.5,
      });
    });

    it('groups by ISO week and sorts the buckets chronologically', async () => {
      prisma.offering.findMany.mockResolvedValue([
        buildRow('100000', 31),
        buildRow('50000', 30),
        buildRow('25000', 31),
      ]);

      const result = await service.summary(query(), admin);

      expect(result.byWeek).toEqual([
        { isoYear: 2026, isoWeek: 30, total: 50000, count: 1 },
        { isoYear: 2026, isoWeek: 31, total: 125000, count: 2 },
      ]);
    });
  });
});
