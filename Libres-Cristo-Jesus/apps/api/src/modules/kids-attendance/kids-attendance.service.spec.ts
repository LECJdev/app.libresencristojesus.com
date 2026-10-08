import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { KidsAttendanceService } from './kids-attendance.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const leaderActor: JwtPayload = {
  sub: 'unit-kids-leader-norte',
  memberId: 'member-kids-leader-norte',
  username: 'kidsleadernorte',
  role: RoleName.KIDS_LEADER,
};

/** Thursday of ISO week 34, 2026. */
const NOW = new Date('2026-08-20T19:00:00Z');

function buildChild(overrides: Record<string, unknown> = {}) {
  return {
    id: 'child-1',
    kidsSchoolId: 'school-norte',
    firstName: 'Ana',
    lastName: 'Pérez',
    photo: null,
    status: RecordStatus.ACTIVE,
    deletedAt: null,
    ...overrides,
  };
}

function buildMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'meeting-1',
    kidsSchoolId: 'school-norte',
    meetingDate: NOW,
    isoYear: 2026,
    isoWeek: 34,
    ...overrides,
  };
}

/** Typed so nested `expect.objectContaining(...)` assertions on these calls stay type-safe. */
interface CreateMeetingArgs {
  data: Record<string, unknown>;
}
interface FindManyArgs {
  where: Record<string, unknown>;
}
interface UpsertAttendanceArgs {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
}

describe('KidsAttendanceService', () => {
  let prisma: {
    kidsSchool: { findFirst: jest.Mock };
    kidsMeeting: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock<Promise<unknown>, [CreateMeetingArgs]>;
    };
    kidsChild: { findMany: jest.Mock<Promise<unknown>, [FindManyArgs]>; count: jest.Mock };
    kidsAttendance: {
      findMany: jest.Mock;
      upsert: jest.Mock<Promise<unknown>, [UpsertAttendanceArgs]>;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: KidsAttendanceService;

  beforeEach(() => {
    prisma = {
      kidsSchool: { findFirst: jest.fn().mockResolvedValue({ id: 'school-norte', deletedAt: null }) },
      kidsMeeting: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn<Promise<unknown>, [CreateMeetingArgs]>(),
      },
      kidsChild: {
        findMany: jest.fn<Promise<unknown>, [FindManyArgs]>().mockResolvedValue([buildChild()]),
        count: jest.fn().mockResolvedValue(0),
      },
      kidsAttendance: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn<Promise<unknown>, [UpsertAttendanceArgs]>(),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };
    service = new KidsAttendanceService(prisma as unknown as PrismaService);
  });

  describe('openCurrentMeeting', () => {
    it('crea la reunión de la semana ISO vigente cuando no existe (lazy creation)', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);
      prisma.kidsMeeting.create.mockResolvedValueOnce(buildMeeting());

      const result = await service.openCurrentMeeting('school-norte', leaderActor, NOW);

      const createCall = prisma.kidsMeeting.create.mock.calls[0]?.[0];
      expect(createCall?.data).toEqual(
        expect.objectContaining({ kidsSchoolId: 'school-norte', isoYear: 2026, isoWeek: 34 }),
      );
      expect(result.meetingId).toBe('meeting-1');
    });

    it('reutiliza la reunión existente en vez de crear una nueva', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(buildMeeting());

      await service.openCurrentMeeting('school-norte', leaderActor, NOW);

      expect(prisma.kidsMeeting.create).not.toHaveBeenCalled();
    });

    it('bajo concurrencia (P2002), relee la reunión creada por el request ganador en vez de fallar', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(buildMeeting());
      prisma.kidsMeeting.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique violation', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.openCurrentMeeting('school-norte', leaderActor, NOW);

      expect(result.meetingId).toBe('meeting-1');
    });

    it('lanza NotFoundException si la sede no existe', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValueOnce(null);

      await expect(service.openCurrentMeeting('school-x', leaderActor, NOW)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getChecklist / buildChecklist', () => {
    it('trae el roster completo de niños activos con su estado de presente/ausente', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValueOnce([
        buildChild({ id: 'child-1', firstName: 'Ana' }),
        buildChild({ id: 'child-2', firstName: 'Luis' }),
      ]);
      prisma.kidsAttendance.findMany.mockResolvedValueOnce([{ kidsChildId: 'child-1', present: true }]);

      const checklist = await service.getChecklist('meeting-1');

      expect(checklist.rows).toHaveLength(2);
      expect(checklist.rows.find((row) => row.childId === 'child-1')?.present).toBe(true);
      // Nadie marcó a child-2 todavía: ausente, no "desconocido" — el checklist es exhaustivo.
      expect(checklist.rows.find((row) => row.childId === 'child-2')?.present).toBe(false);
      expect(checklist.presentCount).toBe(1);
    });

    it('solo incluye niños ACTIVE de la sede en el roster', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(buildMeeting());

      await service.getChecklist('meeting-1');

      const findManyCall = prisma.kidsChild.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.where).toEqual(
        expect.objectContaining({
          kidsSchoolId: 'school-norte',
          status: RecordStatus.ACTIVE,
          deletedAt: null,
        }),
      );
    });

    it('lanza NotFoundException si la reunión no existe', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);

      await expect(service.getChecklist('meeting-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAttendance', () => {
    it('marca a un niño del roster como presente', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValue([buildChild({ id: 'child-1' })]);

      await service.markAttendance('meeting-1', 'child-1', { present: true }, leaderActor);

      expect(prisma.kidsAttendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kidsMeetingId_kidsChildId: { kidsMeetingId: 'meeting-1', kidsChildId: 'child-1' } },
        }),
      );
    });

    it('rechaza marcar un niño que no pertenece al roster de esta sede', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValue([buildChild({ id: 'child-1' })]);

      await expect(
        service.markAttendance('meeting-1', 'child-otra-sede', { present: true }, leaderActor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.kidsAttendance.upsert).not.toHaveBeenCalled();
    });
  });

  describe('markAll / unmarkAll', () => {
    it('markAll marca presentes solo a los ids intersectados con el roster', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValue([
        buildChild({ id: 'child-1' }),
        buildChild({ id: 'child-2' }),
      ]);

      await service.markAll('meeting-1', { childIds: ['child-1', 'child-otra-sede'] }, leaderActor);

      expect(prisma.kidsAttendance.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = prisma.kidsAttendance.upsert.mock.calls[0]?.[0];
      expect(upsertCall?.where).toEqual({
        kidsMeetingId_kidsChildId: { kidsMeetingId: 'meeting-1', kidsChildId: 'child-1' },
      });
      expect(upsertCall?.create).toEqual(expect.objectContaining({ present: true }));
    });

    it('markAll sin childIds aplica a todo el roster', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValue([
        buildChild({ id: 'child-1' }),
        buildChild({ id: 'child-2' }),
      ]);

      await service.markAll('meeting-1', {}, leaderActor);

      expect(prisma.kidsAttendance.upsert).toHaveBeenCalledTimes(2);
    });

    it('unmarkAll desmarca (present: false)', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.kidsChild.findMany.mockResolvedValue([buildChild({ id: 'child-1' })]);

      await service.unmarkAll('meeting-1', {}, leaderActor);

      const upsertCall = prisma.kidsAttendance.upsert.mock.calls[0]?.[0];
      expect(upsertCall?.create).toEqual(expect.objectContaining({ present: false }));
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      prisma.kidsChild.count.mockImplementation((args: { where: Record<string, unknown> }) => {
        if (args.where.status === RecordStatus.INACTIVE) return Promise.resolve(1);
        if (args.where.consent) return Promise.resolve(2);
        if (args.where.createdAt) return Promise.resolve(3);
        // totalChildren (ACTIVE)
        return Promise.resolve(10);
      });
    });

    it('present=0 y absent=totalChildren cuando aún no existe reunión de la semana vigente (sin crearla)', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);

      const metrics = await service.getMetrics('school-norte', NOW);

      expect(metrics.present).toBe(0);
      expect(metrics.absent).toBe(10);
      expect(prisma.kidsMeeting.create).not.toHaveBeenCalled();
    });

    it('present/absent se calculan desde la reunión existente de la semana vigente', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(buildMeeting());
      prisma.kidsAttendance.count.mockResolvedValueOnce(7);

      const metrics = await service.getMetrics('school-norte', NOW);

      expect(metrics.present).toBe(7);
      expect(metrics.absent).toBe(3);
    });

    it('trae pendingConsents, newChildren e inactiveChildren', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);

      const metrics = await service.getMetrics('school-norte', NOW);

      expect(metrics.pendingConsents).toBe(2);
      expect(metrics.newChildren).toBe(3);
      expect(metrics.inactiveChildren).toBe(1);
    });

    it('calcula el trend y el promedio a partir de las últimas reuniones existentes', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);
      prisma.kidsMeeting.findMany.mockResolvedValueOnce([
        buildMeeting({ id: 'm-2', isoWeek: 34 }),
        buildMeeting({ id: 'm-1', isoWeek: 33 }),
      ]);
      // Los counts se resuelven en el orden CRONOLÓGICO en el que el
      // service los pide (semana 33 primero), no en el orden en que
      // `findMany` los devolvió (34, 33).
      prisma.kidsAttendance.count.mockResolvedValueOnce(5).mockResolvedValueOnce(10);

      const metrics = await service.getMetrics('school-norte', NOW);

      // Cronológico: semana 33 primero, luego 34.
      expect(metrics.attendanceTrend.map((point) => point.isoWeek)).toEqual([33, 34]);
      expect(metrics.attendanceTrend[0]?.attendancePercent).toBe(50);
      expect(metrics.attendanceTrend[1]?.attendancePercent).toBe(100);
      expect(metrics.averageAttendance).toBe(75);
    });

    it('averageAttendance es 0 sin reuniones previas, sin dividir por cero', async () => {
      prisma.kidsMeeting.findFirst.mockResolvedValueOnce(null);
      prisma.kidsMeeting.findMany.mockResolvedValueOnce([]);

      const metrics = await service.getMetrics('school-norte', NOW);

      expect(metrics.averageAttendance).toBe(0);
      expect(metrics.attendanceTrend).toEqual([]);
    });
  });
});
