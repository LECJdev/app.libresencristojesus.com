import { Workbook } from 'exceljs';
import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { ReportsService } from './reports.service';
import { ReportType } from './dto/report.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * WHAT THESE TESTS ARE REALLY PROTECTING
 *
 * 1. THAT THE SHEET AND THE SCREEN CANNOT DRIFT. Both render one definition,
 *    so the export's header row must equal the preview's column list. If
 *    that ever stops holding, somebody is reconciling two spreadsheets that
 *    disagree and has no way to tell which is right.
 * 2. THAT AN EXPORT RESPECTS SCOPE. This is the most dangerous read in the
 *    product: it produces a file that leaves the system and gets forwarded
 *    by e-mail. A leak here is not recoverable.
 * 3. That the workbook actually opens — a corrupt `.xlsx` fails at the user,
 *    never in CI, unless something reads it back.
 */
describe('ReportsService', () => {
  const admin: JwtPayload = {
    sub: 'admin-1',
    memberId: 'member-admin-1',
    username: 'admin',
    role: RoleName.ADMIN,
  };
  const leader: JwtPayload = {
    sub: 'leader-1',
    memberId: 'member-leader-1',
    username: 'lider',
    role: RoleName.LEADER,
  };
  const districtPastor: JwtPayload = {
    sub: 'dp-1',
    memberId: 'dp-1-member',
    username: 'pastor',
    role: RoleName.DISTRICT_PASTOR,
  };

  type QueryMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  const queryMock = (): QueryMock => jest.fn<Promise<unknown>, [Record<string, unknown>]>();
  const argOf = <T>(mock: QueryMock, index = 0): T => mock.mock.calls[index]?.[0] as T;

  const query = { page: 1, pageSize: 20, order: 'asc' as const };

  const offeringRow = {
    amount: new Prisma.Decimal('250000'),
    notes: 'Ofrenda especial',
    meeting: {
      meetingDate: new Date('2026-07-16T00:00:00.000Z'),
      isoYear: 2026,
      isoWeek: 29,
      meetingSchedule: {
        peaceHouse: { name: 'Casa Esperanza', district: { name: 'Distrito 09' } },
      },
    },
  };

  let prisma: {
    meeting: { findMany: QueryMock; count: QueryMock };
    offering: { findMany: QueryMock; count: QueryMock };
    person: { findMany: QueryMock; count: QueryMock };
    peaceHouse: { findMany: QueryMock; count: QueryMock };
  };
  let service: ReportsService;

  beforeEach(() => {
    prisma = {
      meeting: {
        findMany: queryMock().mockResolvedValue([]),
        count: queryMock().mockResolvedValue(0),
      },
      offering: {
        findMany: queryMock().mockResolvedValue([]),
        count: queryMock().mockResolvedValue(0),
      },
      person: {
        findMany: queryMock().mockResolvedValue([]),
        count: queryMock().mockResolvedValue(0),
      },
      peaceHouse: {
        findMany: queryMock().mockResolvedValue([]),
        count: queryMock().mockResolvedValue(0),
      },
    };
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  describe('one definition, two renderers', () => {
    it.each([
      ReportType.ATTENDANCE,
      ReportType.OFFERINGS,
      ReportType.PEOPLE,
      ReportType.PEACE_HOUSES,
    ])('exports %s with exactly the headers the preview declares', async (type) => {
      const { data } = await service.preview(type, query, admin);
      const { buffer } = await service.export(type, query, admin);

      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0]!;

      const sheetHeaders = (sheet.getRow(1).values as unknown[]).slice(1);
      expect(sheetHeaders).toEqual(data.columns.map((column) => column.header));
    });

    it('writes the row values under their own columns', async () => {
      prisma.offering.findMany.mockResolvedValue([offeringRow]);

      const { buffer } = await service.export(ReportType.OFFERINGS, query, admin);
      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0]!;

      const values = (sheet.getRow(2).values as unknown[]).slice(1);
      expect(values).toEqual([
        '2026-07-16',
        '29/2026',
        'Distrito 09',
        'Casa Esperanza',
        250000,
        'Ofrenda especial',
      ]);
    });

    it('produces a workbook that reloads — a corrupt file only fails at the user', async () => {
      prisma.offering.findMany.mockResolvedValue([offeringRow]);

      const { buffer } = await service.export(ReportType.OFFERINGS, query, admin);

      const workbook = new Workbook();
      await expect(workbook.xlsx.load(buffer as unknown as ArrayBuffer)).resolves.toBeDefined();
      expect(workbook.worksheets).toHaveLength(1);
    });
  });

  describe('scope on export (the file leaves the system)', () => {
    it('does not restrict an Administrador', async () => {
      await service.export(ReportType.OFFERINGS, query, admin);

      const call = argOf<{
        where: { meeting: { meetingSchedule: { peaceHouse: Record<string, unknown> } } };
      }>(prisma.offering.findMany);
      expect(call.where.meeting.meetingSchedule.peaceHouse).toMatchObject({ deletedAt: null });
      expect(call.where.meeting.meetingSchedule.peaceHouse).not.toHaveProperty('leadershipUnitId');
    });

    it('restricts a Líder to their own Casa de Paz', async () => {
      await service.export(ReportType.OFFERINGS, query, leader);

      const call = argOf<{
        where: { meeting: { meetingSchedule: { peaceHouse: Record<string, unknown> } } };
      }>(prisma.offering.findMany);
      expect(call.where.meeting.meetingSchedule.peaceHouse).toMatchObject({
        leadershipUnitId: 'leader-1',
      });
    });

    it('restricts a Pastor de Distrito to their district', async () => {
      await service.export(ReportType.PEACE_HOUSES, query, districtPastor);

      const call = argOf<{ where: Record<string, unknown> }>(prisma.peaceHouse.findMany);
      expect(call.where).toMatchObject({ district: { leadershipUnitId: 'dp-1' } });
    });

    it('scopes the People report through the OPEN membership period', async () => {
      await service.export(ReportType.PEOPLE, query, leader);

      const call = argOf<{
        where: {
          peaceHouseHistory: {
            some: { endDate: null; peaceHouse: Record<string, unknown> };
          };
        };
      }>(prisma.person.findMany);

      expect(call.where.peaceHouseHistory.some.endDate).toBeNull();
      expect(call.where.peaceHouseHistory.some.peaceHouse).toMatchObject({
        leadershipUnitId: 'leader-1',
      });
    });
  });

  describe('date range', () => {
    it('applies it to a report about events', async () => {
      await service.preview(
        ReportType.OFFERINGS,
        { ...query, from: '2026-07-01', to: '2026-07-31' },
        admin,
      );

      const call = argOf<{
        where: { meeting: { meetingDate: { gte: Date; lte: Date } } };
      }>(prisma.offering.findMany);
      expect(call.where.meeting.meetingDate.gte.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    });

    it('IGNORES it on a report about a present state, instead of filtering by creation date', async () => {
      await service.preview(
        ReportType.PEACE_HOUSES,
        { ...query, from: '2026-07-01', to: '2026-07-31' },
        admin,
      );

      const call = argOf<{ where: Record<string, unknown> }>(prisma.peaceHouse.findMany);
      expect(call.where).not.toHaveProperty('createdAt');
      expect(call.where).not.toHaveProperty('meetingDate');
    });
  });

  describe('preview', () => {
    it('paginates, while the export does not', async () => {
      await service.preview(ReportType.OFFERINGS, { ...query, page: 3, pageSize: 20 }, admin);
      const previewCall = argOf<{ take?: number; skip?: number }>(prisma.offering.findMany);
      expect(previewCall).toMatchObject({ take: 20, skip: 40 });

      prisma.offering.findMany.mockClear();
      await service.export(ReportType.OFFERINGS, { ...query, page: 3, pageSize: 20 }, admin);
      const exportCall = argOf<{ take?: number; skip?: number }>(prisma.offering.findMany);
      expect(exportCall.skip).toBeUndefined();
      expect(exportCall.take).toBe(50_000);
    });

    it('reports the total of the whole filter, not of the page', async () => {
      prisma.offering.count.mockResolvedValue(137);

      const { meta } = await service.preview(ReportType.OFFERINGS, query, admin);

      expect(meta.total).toBe(137);
      expect(meta.pages).toBe(7);
    });

    it('describes the scope so the reader knows what the figures cover', async () => {
      const { data } = await service.preview(ReportType.OFFERINGS, query, leader);
      expect(data.scopeLabel).toBe('Su Casa de Paz');
    });
  });

  describe('attendance percentage', () => {
    it('does not divide by zero when the roster is empty', async () => {
      prisma.meeting.findMany.mockResolvedValue([
        {
          meetingDate: new Date('2026-07-16T00:00:00.000Z'),
          isoYear: 2026,
          isoWeek: 29,
          meetingSchedule: {
            peaceHouse: {
              name: 'Casa Nueva',
              district: { name: 'Distrito 01' },
              _count: { personHistory: 0 },
            },
          },
          _count: { attendances: 0 },
        },
      ]);

      const { data } = await service.preview(ReportType.ATTENDANCE, query, admin);

      expect(data.rows[0]?.rate).toBe(0);
      expect(Number.isNaN(data.rows[0]?.rate)).toBe(false);
    });

    it('computes the rate to one decimal', async () => {
      prisma.meeting.findMany.mockResolvedValue([
        {
          meetingDate: new Date('2026-07-16T00:00:00.000Z'),
          isoYear: 2026,
          isoWeek: 29,
          meetingSchedule: {
            peaceHouse: {
              name: 'Casa Esperanza',
              district: { name: 'Distrito 09' },
              _count: { personHistory: 3 },
            },
          },
          _count: { attendances: 2 },
        },
      ]);

      const { data } = await service.preview(ReportType.ATTENDANCE, query, admin);

      expect(data.rows[0]?.rate).toBe(66.7);
    });
  });

  describe('filename', () => {
    it('strips accents and dates the file, so a folder of downloads stays readable', async () => {
      const { filename } = await service.export(ReportType.ATTENDANCE, query, admin);

      expect(filename).toMatch(/^asistencia-por-reunion-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });
  });
});
