import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { AttendanceService } from './attendance.service';
import type { AttendanceLockService, LockState } from './attendance-lock.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const admin: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};
const leader: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'lider',
  role: RoleName.LEADER,
};
const districtPastor: JwtPayload = {
  sub: 'unit-pastor',
  memberId: 'member-pastor',
  username: 'pastor',
  role: RoleName.DISTRICT_PASTOR,
};

/** Thursday of ISO week 31, 2026. */
const NOW = new Date('2026-07-30T19:00:00Z');

const EDITABLE: LockState = {
  editable: true,
  reason: 'current-week',
  editableUntil: new Date('2026-08-02T23:59:59.999Z'),
  unlockedUntil: null,
};

const LOCKED: LockState = {
  editable: false,
  reason: 'past-week',
  editableUntil: new Date('2026-08-02T23:59:59.999Z'),
  unlockedUntil: null,
};

function buildMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'meeting-1',
    meetingScheduleId: 'schedule-1',
    meetingDate: NOW,
    isoYear: 2026,
    isoWeek: 31,
    status: 'PROGRAMADA',
    meetingSchedule: { peaceHouseId: 'house-1' },
    ...overrides,
  };
}

/** Satisfies both selects the service performs on this table. */
function buildMembership(personId: string, firstName = 'Ana') {
  return {
    personId,
    person: {
      id: personId,
      firstName,
      lastName: 'Asistente',
      photo: null,
      personStage: null,
    },
  };
}

describe('AttendanceService', () => {
  let prisma: {
    peaceHouse: { findFirst: jest.Mock };
    meetingSchedule: { findFirst: jest.Mock; create: jest.Mock };
    meeting: { findFirst: jest.Mock; create: jest.Mock };
    meetingUnlock: { create: jest.Mock };
    personPeaceHouseHistory: { findMany: jest.Mock };
    attendance: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let lockService: { getLockState: jest.Mock; findActiveUnlock: jest.Mock };
  let service: AttendanceService;

  beforeEach(() => {
    prisma = {
      peaceHouse: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'house-1',
          meetingDay: 'Jueves',
          meetingHour: '19:00',
        }),
      },
      meetingSchedule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'schedule-1', meetingDay: 'Jueves' }),
        create: jest.fn().mockResolvedValue({ id: 'schedule-new', meetingDay: 'Jueves' }),
      },
      meeting: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      meetingUnlock: { create: jest.fn().mockResolvedValue({}) },
      personPeaceHouseHistory: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    // The lock rules have their own 11 tests; mocking the service keeps
    // these focused on what AttendanceService itself decides.
    lockService = {
      getLockState: jest.fn().mockResolvedValue(EDITABLE),
      findActiveUnlock: jest.fn().mockResolvedValue(null),
    };

    service = new AttendanceService(
      prisma as unknown as PrismaService,
      lockService as unknown as AttendanceLockService,
    );
  });

  describe('openCurrentMeeting — creación lazy', () => {
    it('creates this ISO week meeting on the schedule weekday', async () => {
      prisma.meeting.create.mockResolvedValue(buildMeeting());

      const result = await service.openCurrentMeeting('house-1', leader, NOW);

      const [createArgs] = prisma.meeting.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(createArgs.data).toMatchObject({
        meetingScheduleId: 'schedule-1',
        isoYear: 2026,
        isoWeek: 31,
        createdBy: leader.sub,
      });
      // "Jueves" -> Thursday of that ISO week, at midnight UTC.
      expect((createArgs.data.meetingDate as Date).toISOString()).toBe('2026-07-30T00:00:00.000Z');
      expect(result.isoWeek).toBe(31);
    });

    it('reuses the existing meeting instead of creating a second one', async () => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting());

      const result = await service.openCurrentMeeting('house-1', leader, NOW);

      expect(prisma.meeting.create).not.toHaveBeenCalled();
      expect(result.meetingId).toBe('meeting-1');
    });

    it('re-reads the winner row when a concurrent request won the insert', async () => {
      // Two leaders open the module in the same second: both find nothing,
      // both insert, the unique constraint lets exactly one through.
      const conflict = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.meeting.create.mockRejectedValue(conflict);
      prisma.meeting.findFirst
        .mockResolvedValueOnce(null) // initial lookup
        .mockResolvedValueOnce(buildMeeting()); // re-read after P2002

      const result = await service.openCurrentMeeting('house-1', leader, NOW);

      // Losing the race is a normal outcome, not an error to surface.
      expect(result.meetingId).toBe('meeting-1');
    });

    it('rethrows a database error that is not a unique violation', async () => {
      prisma.meeting.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.openCurrentMeeting('house-1', leader, NOW)).rejects.toThrow(
        'connection lost',
      );
    });

    it('seeds the schedule from the Casa de Paz when none exists', async () => {
      prisma.meetingSchedule.findFirst.mockResolvedValue(null);
      prisma.meeting.create.mockResolvedValue(buildMeeting());

      await service.openCurrentMeeting('house-1', leader, NOW);

      const [scheduleArgs] = prisma.meetingSchedule.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(scheduleArgs.data).toMatchObject({
        peaceHouseId: 'house-1',
        meetingDay: 'Jueves',
        meetingHour: '19:00',
        active: true,
      });
    });

    it('rejects a Casa de Paz with no meeting day at all', async () => {
      prisma.meetingSchedule.findFirst.mockResolvedValue(null);
      prisma.peaceHouse.findFirst.mockResolvedValue({
        id: 'house-1',
        meetingDay: null,
        meetingHour: null,
      });

      await expect(service.openCurrentMeeting('house-1', leader, NOW)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an unreadable weekday rather than guessing one', async () => {
      prisma.meetingSchedule.findFirst.mockResolvedValue({
        id: 'schedule-1',
        meetingDay: 'cuandoseapueda',
      });

      // Inventing a meeting on the wrong day is worse than failing.
      await expect(service.openCurrentMeeting('house-1', leader, NOW)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.meeting.create).not.toHaveBeenCalled();
    });

    it('throws 404 when the Casa de Paz does not exist', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(null);

      await expect(service.openCurrentMeeting('ghost', leader, NOW)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAttendance', () => {
    beforeEach(() => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.personPeaceHouseHistory.findMany.mockResolvedValue([buildMembership('person-1')]);
    });

    it('marks a person of the roster and records the arrival time', async () => {
      await service.markAttendance('meeting-1', 'person-1', { present: true }, leader, NOW);

      const [args] = prisma.attendance.upsert.mock.calls[0]! as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      expect(args.create).toMatchObject({ present: true, createdBy: leader.sub });
      expect(args.create.arrivalTime).toBe(NOW);
    });

    it('clears the arrival time when marking someone absent', async () => {
      await service.markAttendance('meeting-1', 'person-1', { present: false }, leader, NOW);

      const [args] = prisma.attendance.upsert.mock.calls[0]! as [
        { create: Record<string, unknown> },
      ];
      // Only a present person has an arrival time.
      expect(args.create.arrivalTime).toBeNull();
    });

    it('rejects someone who does not belong to this Casa de Paz', async () => {
      await expect(
        service.markAttendance('meeting-1', 'outsider', { present: true }, leader, NOW),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });

    it('refuses to write when the week is locked', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await expect(
        service.markAttendance('meeting-1', 'person-1', { present: true }, leader, NOW),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });

    it('throws 404 for a meeting that does not exist', async () => {
      prisma.meeting.findFirst.mockResolvedValue(null);

      await expect(
        service.markAttendance('ghost', 'person-1', { present: true }, leader, NOW),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAll', () => {
    beforeEach(() => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting());
      prisma.personPeaceHouseHistory.findMany.mockResolvedValue([
        buildMembership('person-1'),
        buildMembership('person-2', 'Luis'),
      ]);
    });

    it('applies to the whole roster when no subset is given', async () => {
      await service.markAll('meeting-1', { present: true }, leader, NOW);

      expect(prisma.attendance.upsert).toHaveBeenCalledTimes(2);
    });

    it('intersects an explicit subset with the roster', async () => {
      // Trusting the client here would let someone mark a person from
      // another Casa de Paz.
      await service.markAll(
        'meeting-1',
        { present: true, personIds: ['person-1', 'outsider'] },
        leader,
        NOW,
      );

      expect(prisma.attendance.upsert).toHaveBeenCalledTimes(1);
    });

    it('unmarks everyone with the same endpoint', async () => {
      await service.markAll('meeting-1', { present: false }, leader, NOW);

      const [args] = prisma.attendance.upsert.mock.calls[0]! as [
        { update: Record<string, unknown> },
      ];
      expect(args.update.present).toBe(false);
    });

    it('refuses to write when the week is locked', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await expect(service.markAll('meeting-1', { present: true }, leader, NOW)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unlock', () => {
    beforeEach(() => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting());
    });

    it('denies a Líder — they cannot reopen their own closed week', async () => {
      await expect(
        service.unlock('meeting-1', { reason: 'me olvidé' }, leader, NOW),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.meetingUnlock.create).not.toHaveBeenCalled();
    });

    it('records who, when, why and until when', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await service.unlock('meeting-1', { reason: '  Reporte tardío  ' }, districtPastor, NOW);

      const [args] = prisma.meetingUnlock.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toMatchObject({
        meetingId: 'meeting-1',
        unlockedBy: districtPastor.sub,
        reason: 'Reporte tardío',
        unlockedAt: NOW,
      });
      // Approved rule 3: 7 calendar days.
      expect((args.data.expiresAt as Date).toISOString()).toBe('2026-08-06T19:00:00.000Z');
    });

    it('rejects reopening a meeting that is not locked', async () => {
      lockService.getLockState.mockResolvedValue(EDITABLE);

      // It would leave a misleading audit entry suggesting an exception was
      // needed.
      await expect(
        service.unlock('meeting-1', { reason: 'por si acaso' }, admin, NOW),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.meetingUnlock.create).not.toHaveBeenCalled();
    });

    it('evaluates the lock as a Líder would see it, not as the pastor', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await service.unlock('meeting-1', { reason: 'Reporte tardío' }, districtPastor, NOW);

      // The pastor is exempt from the calendar, so asking with their own
      // role would always answer "editable" and block every reopening.
      const [, , actorUsed] = lockService.getLockState.mock.calls[0]! as [string, Date, JwtPayload];
      expect(actorUsed.role).toBe(RoleName.LEADER);
    });
  });
});
