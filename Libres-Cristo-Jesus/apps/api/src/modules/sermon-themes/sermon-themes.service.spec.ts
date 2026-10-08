import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { SermonThemesService } from './sermon-themes.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { ListSermonThemesQueryDto } from './dto/sermon-theme.dto';

const leader: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'lider',
  role: RoleName.LEADER,
};

function buildTheme(overrides: Record<string, unknown> = {}) {
  return {
    id: 'theme-1',
    title: 'La fe que obra',
    description: 'Santiago 2',
    series: 'Fundamentos',
    status: RecordStatus.ACTIVE,
    version: 1,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

function query(overrides: Partial<ListSermonThemesQueryDto> = {}): ListSermonThemesQueryDto {
  return { page: 1, pageSize: 20, order: 'asc', ...overrides };
}

/** The unique-violation Prisma raises when the index catches a race. */
function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.9.0',
  });
}

describe('SermonThemesService', () => {
  let prisma: {
    sermonTheme: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: SermonThemesService;

  beforeEach(() => {
    prisma = {
      sermonTheme: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(buildTheme()),
        update: jest.fn().mockResolvedValue(buildTheme()),
      },
      $transaction: jest.fn((arg: unknown) => Promise.all(arg as Promise<unknown>[])),
    };

    service = new SermonThemesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('trims the title and records who created it', async () => {
      await service.create({ title: '  La fe que obra  ', series: ' Fundamentos ' }, leader);

      const [args] = prisma.sermonTheme.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toMatchObject({
        title: 'La fe que obra',
        series: 'Fundamentos',
        createdBy: leader.sub,
      });
    });

    it('turns an empty optional string into null instead of storing ""', async () => {
      await service.create({ title: 'Tema', description: '   ' }, leader);

      const [args] = prisma.sermonTheme.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      // An empty string reads as "someone wrote something"; null does not.
      expect(args.data.description).toBeNull();
    });

    it('rejects a duplicate title regardless of capitalisation', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(buildTheme());

      await expect(service.create({ title: 'la FE que obra' }, leader)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.sermonTheme.create).not.toHaveBeenCalled();
    });

    it('compares titles case-insensitively in the database, not in memory', async () => {
      await service.create({ title: 'Tema' }, leader);

      const [args] = prisma.sermonTheme.findFirst.mock.calls[0]! as [
        { where: { title: { mode?: string } } },
      ];
      expect(args.where.title.mode).toBe('insensitive');
    });

    it('turns a lost race into a clean 409 instead of a raw constraint error', async () => {
      // The pre-check passed, then another request inserted the same title
      // microseconds later. The index is what actually holds the rule.
      prisma.sermonTheme.create.mockRejectedValue(uniqueViolation());

      await expect(service.create({ title: 'Tema' }, leader)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('excludes soft-deleted themes', async () => {
      await service.findAll(query());

      const [args] = prisma.sermonTheme.count.mock.calls[0]! as [
        { where: Record<string, unknown> },
      ];
      expect(args.where.deletedAt).toBeNull();
    });

    it('searches title, series and description together', async () => {
      await service.findAll(query({ search: 'fe' }));

      const [args] = prisma.sermonTheme.count.mock.calls[0]! as [
        { where: { OR?: Record<string, unknown>[] } },
      ];
      expect(args.where.OR).toHaveLength(3);
    });

    it('falls back to title for an unknown sort column', async () => {
      await service.findAll(query({ sort: 'DROP TABLE' }));

      const [args] = prisma.sermonTheme.findMany.mock.calls[0]! as [
        { orderBy: Record<string, unknown> },
      ];
      expect(args.orderBy).toEqual({ title: 'asc' });
    });

    it('reports the page count from the total, not from the rows returned', async () => {
      prisma.sermonTheme.count.mockResolvedValue(45);

      const result = await service.findAll(query({ pageSize: 20 }));

      expect(result.meta).toMatchObject({ total: 45, pages: 3 });
    });
  });

  describe('findSeries', () => {
    it('returns distinct series and drops the null ones', async () => {
      prisma.sermonTheme.findMany.mockResolvedValue([
        { series: 'Fundamentos' },
        { series: null },
        { series: 'Familia' },
      ]);

      await expect(service.findSeries()).resolves.toEqual(['Fundamentos', 'Familia']);
    });
  });

  describe('update', () => {
    it('puts the read version in the WHERE — that IS the optimistic lock', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(buildTheme());

      await service.update('theme-1', { version: 4 }, leader);

      const [args] = prisma.sermonTheme.update.mock.calls[0]! as [
        { where: Record<string, unknown>; data: Record<string, unknown> },
      ];
      expect(args.where).toEqual({ id: 'theme-1', version: 4 });
      expect(args.data.version).toEqual({ increment: 1 });
    });

    it('translates a stale write (P2025) into a version conflict', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(buildTheme());
      prisma.sermonTheme.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.0',
        }),
      );

      await expect(service.update('theme-1', { version: 1 }, leader)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('does not check the title against itself when it did not change', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(buildTheme());

      await service.update('theme-1', { title: 'La fe que obra', version: 1 }, leader);

      // One call only: the lookup of the theme being edited.
      expect(prisma.sermonTheme.findFirst).toHaveBeenCalledTimes(1);
    });

    it('rejects renaming a theme onto an existing title', async () => {
      prisma.sermonTheme.findFirst
        .mockResolvedValueOnce(buildTheme())
        .mockResolvedValueOnce(buildTheme({ id: 'theme-2', title: 'Otro' }));

      await expect(
        service.update('theme-1', { title: 'Otro', version: 1 }, leader),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('fails with 404 on a theme that does not exist', async () => {
      await expect(service.update('missing', { version: 1 }, leader)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes and deactivates instead of erasing', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(buildTheme());

      await service.remove('theme-1', leader);

      const [args] = prisma.sermonTheme.update.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      // The meetings that used it keep pointing at it: erasing a theme
      // would rewrite history.
      expect(args.data).toMatchObject({
        deletedBy: leader.sub,
        status: RecordStatus.INACTIVE,
      });
      expect(args.data.deletedAt).toBeInstanceOf(Date);
    });
  });
});
