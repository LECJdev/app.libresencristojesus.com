import { RoleName } from '@lcj/types';
import { AttendanceLockService, UNLOCK_DURATION_DAYS } from './attendance-lock.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

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

/** ISO week 31 of 2026 runs Mon 2026-07-27 .. Sun 2026-08-02. */
const MEETING_DATE = new Date('2026-07-30T19:00:00Z'); // Thursday, week 31
const SAME_WEEK_SUNDAY = new Date('2026-08-02T23:00:00Z');
const NEXT_WEEK_MONDAY = new Date('2026-08-03T00:01:00Z');

describe('AttendanceLockService', () => {
  let prisma: { meetingUnlock: { findFirst: jest.Mock } };
  let service: AttendanceLockService;

  beforeEach(() => {
    prisma = { meetingUnlock: { findFirst: jest.fn().mockResolvedValue(null) } };
    service = new AttendanceLockService(prisma as unknown as PrismaService);
  });

  describe('regla 1 — semana en curso', () => {
    it('lets a Líder edit a meeting of the current ISO week', async () => {
      const state = await service.getLockState('m1', MEETING_DATE, leader, MEETING_DATE);

      expect(state).toMatchObject({ editable: true, reason: 'current-week' });
      // No need to look for a reopening when the week is still open.
      expect(prisma.meetingUnlock.findFirst).not.toHaveBeenCalled();
    });

    it('still lets a Líder edit on the Sunday that closes the week', async () => {
      const state = await service.getLockState('m1', MEETING_DATE, leader, SAME_WEEK_SUNDAY);

      expect(state.editable).toBe(true);
      expect(state.editableUntil?.toISOString()).toBe('2026-08-02T23:59:59.999Z');
    });

    it('locks the Líder out one minute into the next ISO week', async () => {
      // This is the exact boundary RN-407 turns on.
      const state = await service.getLockState('m1', MEETING_DATE, leader, NEXT_WEEK_MONDAY);

      expect(state).toMatchObject({ editable: false, reason: 'past-week' });
    });
  });

  describe('regla 2 — roles exentos', () => {
    it('never blocks an Administrador by the calendar', async () => {
      const state = await service.getLockState('m1', MEETING_DATE, admin, NEXT_WEEK_MONDAY);

      expect(state).toMatchObject({ editable: true, reason: 'role-exempt' });
    });

    it('never blocks a Pastor de Distrito by the calendar', async () => {
      // They are the ones who can reopen, so blocking them would be circular.
      const state = await service.getLockState(
        'm1',
        MEETING_DATE,
        districtPastor,
        NEXT_WEEK_MONDAY,
      );

      expect(state).toMatchObject({ editable: true, reason: 'role-exempt' });
    });

    it('does NOT exempt a Pastor General', async () => {
      // doc05 gives "Registrar Asistencia" to Administrador and Líder only;
      // a Pastor General is not among the roles RN-407 exempts either.
      const state = await service.getLockState('m1', MEETING_DATE, generalPastor, NEXT_WEEK_MONDAY);

      expect(state.editable).toBe(false);
    });
  });

  describe('regla 3 — desbloqueo vigente', () => {
    it('lets a Líder edit a past meeting while a reopening is in force', async () => {
      const expiresAt = new Date('2026-08-10T00:00:00Z');
      prisma.meetingUnlock.findFirst.mockResolvedValue({ id: 'unlock-1', expiresAt });

      const state = await service.getLockState('m1', MEETING_DATE, leader, NEXT_WEEK_MONDAY);

      expect(state).toMatchObject({ editable: true, reason: 'unlocked', unlockedUntil: expiresAt });
    });

    it('keeps the meeting locked when no reopening exists', async () => {
      prisma.meetingUnlock.findFirst.mockResolvedValue(null);

      const state = await service.getLockState('m1', MEETING_DATE, leader, NEXT_WEEK_MONDAY);

      expect(state.editable).toBe(false);
    });

    it('asks the database only for unrevoked, unexpired reopenings', async () => {
      const now = NEXT_WEEK_MONDAY;
      await service.getLockState('m1', MEETING_DATE, leader, now);

      const [args] = prisma.meetingUnlock.findFirst.mock.calls[0]! as [
        { where: Record<string, unknown> },
      ];
      expect(args.where).toMatchObject({ meetingId: 'm1', revokedAt: null });
      // An expired reopening must not count — that is what makes the
      // 7-day window mean anything.
      expect(args.where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: now } }]);
    });
  });

  describe('expiryFrom', () => {
    it('adds exactly 7 calendar days', () => {
      const expires = AttendanceLockService.expiryFrom(new Date('2026-08-03T10:00:00Z'));

      expect(expires.toISOString()).toBe('2026-08-10T10:00:00.000Z');
      expect(UNLOCK_DURATION_DAYS).toBe(7);
    });
  });

  describe('canUnlock', () => {
    it('allows only Administrador and Pastor de Distrito', () => {
      expect(AttendanceLockService.canUnlock(RoleName.ADMIN)).toBe(true);
      expect(AttendanceLockService.canUnlock(RoleName.DISTRICT_PASTOR)).toBe(true);
      expect(AttendanceLockService.canUnlock(RoleName.LEADER)).toBe(false);
      expect(AttendanceLockService.canUnlock(RoleName.GENERAL_PASTOR)).toBe(false);
    });
  });
});
