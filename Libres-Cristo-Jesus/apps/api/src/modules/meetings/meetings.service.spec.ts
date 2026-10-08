import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { MeetingsService } from './meetings.service';
import type { AttendanceLockService, LockState } from '../attendance/attendance-lock.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const leader: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'lider',
  role: RoleName.LEADER,
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
  editableUntil: new Date('2026-07-26T23:59:59.999Z'),
  unlockedUntil: null,
};

function buildOffering(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offering-1',
    meetingId: 'meeting-1',
    amount: new Prisma.Decimal('250000.00'),
    currency: 'COP',
    notes: null,
    registeredBy: 'unit-leader',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function buildPhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'photo-1',
    meetingId: 'meeting-1',
    path: 'meeting-photo/2026/uno.jpg',
    caption: null,
    sortOrder: 0,
    hiddenAt: null,
    hiddenBy: null,
    createdAt: NOW,
    version: 1,
    ...overrides,
  };
}

function buildMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'meeting-1',
    meetingDate: NOW,
    isoYear: 2026,
    isoWeek: 31,
    status: 'PROGRAMADA',
    preacher: null,
    notes: null,
    meetingSchedule: { peaceHouseId: 'house-1', peaceHouse: { name: 'Casa Esperanza' } },
    theme: null,
    offering: null,
    photos: [],
    ...overrides,
  };
}

describe('MeetingsService', () => {
  let prisma: {
    meeting: { findFirst: jest.Mock; update: jest.Mock };
    sermonTheme: { findFirst: jest.Mock };
    offering: { upsert: jest.Mock; update: jest.Mock };
    meetingPhoto: { create: jest.Mock; update: jest.Mock };
    attendance: { count: jest.Mock };
    personPeaceHouseHistory: { count: jest.Mock };
  };
  let lockService: { getLockState: jest.Mock };
  let service: MeetingsService;

  beforeEach(() => {
    prisma = {
      meeting: {
        findFirst: jest.fn().mockResolvedValue(buildMeeting()),
        update: jest.fn().mockResolvedValue({}),
      },
      sermonTheme: { findFirst: jest.fn().mockResolvedValue({ id: 'theme-1' }) },
      offering: {
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      meetingPhoto: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      attendance: { count: jest.fn().mockResolvedValue(3) },
      personPeaceHouseHistory: { count: jest.fn().mockResolvedValue(8) },
    };

    // The calendar rule has its own 11 tests in AttendanceLockService.
    // Mocking it keeps these focused on what MeetingsService decides —
    // and proves it ASKS instead of deciding for itself.
    lockService = { getLockState: jest.fn().mockResolvedValue(EDITABLE) };

    service = new MeetingsService(
      prisma as unknown as PrismaService,
      lockService as unknown as AttendanceLockService,
    );
  });

  describe('getReport', () => {
    it('resolves the theme title and series for the screen', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ theme: { id: 'theme-1', title: 'La fe', series: 'Fundamentos' } }),
      );

      const report = await service.getReport('meeting-1', leader, NOW);

      expect(report).toMatchObject({
        themeId: 'theme-1',
        themeTitle: 'La fe',
        themeSeries: 'Fundamentos',
        peaceHouseName: 'Casa Esperanza',
      });
    });

    it('carries the attendance counts so the screen needs no second call', async () => {
      const report = await service.getReport('meeting-1', leader, NOW);

      expect(report).toMatchObject({ presentCount: 3, rosterCount: 8 });
    });

    it('reports a soft-deleted offering as absent', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ offering: buildOffering({ deletedAt: NOW }) }),
      );

      const report = await service.getReport('meeting-1', leader, NOW);

      expect(report.offering).toBeNull();
    });

    it('fails with 404 on a meeting that does not exist', async () => {
      prisma.meeting.findFirst.mockResolvedValue(null);

      await expect(service.getReport('missing', leader, NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('El candado es el de la asistencia', () => {
    it('refuses to write the report on a locked week', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await expect(
        service.updateReport('meeting-1', { preacher: 'Alguien' }, leader, NOW),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.meeting.update).not.toHaveBeenCalled();
    });

    it('refuses to write the offering on a locked week', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await expect(
        service.upsertOffering('meeting-1', { amount: 1000 }, leader, NOW),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.offering.upsert).not.toHaveBeenCalled();
    });

    it('refuses to add a photograph on a locked week', async () => {
      lockService.getLockState.mockResolvedValue(LOCKED);

      await expect(
        service.addPhoto('meeting-1', { path: 'x.jpg' }, leader, NOW),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.meetingPhoto.create).not.toHaveBeenCalled();
    });

    it('asks the SAME service the attendance sheet asks — it does not decide', async () => {
      await service.updateReport('meeting-1', { preacher: 'Alguien' }, leader, NOW);

      expect(lockService.getLockState).toHaveBeenCalledWith('meeting-1', NOW, leader, NOW);
    });
  });

  describe('updateReport', () => {
    it('distinguishes "clear the theme" (null) from "leave it alone" (undefined)', async () => {
      await service.updateReport('meeting-1', { themeId: null }, leader, NOW);

      const [args] = prisma.meeting.update.mock.calls[0]! as [{ data: Record<string, unknown> }];
      expect(args.data).toHaveProperty('themeId', null);
    });

    it('does not touch the theme when the field is absent', async () => {
      await service.updateReport('meeting-1', { preacher: 'Invitado' }, leader, NOW);

      const [args] = prisma.meeting.update.mock.calls[0]! as [{ data: Record<string, unknown> }];
      expect(args.data).not.toHaveProperty('themeId');
    });

    it('rejects a theme that does not exist, before writing anything', async () => {
      prisma.sermonTheme.findFirst.mockResolvedValue(null);

      await expect(
        service.updateReport('meeting-1', { themeId: 'ghost' }, leader, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.meeting.update).not.toHaveBeenCalled();
    });

    it('stores a blank preacher as null, not as an empty string', async () => {
      await service.updateReport('meeting-1', { preacher: '   ' }, leader, NOW);

      const [args] = prisma.meeting.update.mock.calls[0]! as [{ data: Record<string, unknown> }];
      expect(args.data.preacher).toBeNull();
    });
  });

  describe('upsertOffering', () => {
    it('upserts on meetingId — RN-039 allows exactly one per meeting', async () => {
      await service.upsertOffering('meeting-1', { amount: 250000 }, leader, NOW);

      const [args] = prisma.offering.upsert.mock.calls[0]! as [
        { where: Record<string, unknown>; create: Record<string, unknown> },
      ];
      expect(args.where).toEqual({ meetingId: 'meeting-1' });
      expect(args.create.registeredBy).toBe(leader.sub);
    });

    it('stores the amount as Decimal, never as a float', async () => {
      await service.upsertOffering('meeting-1', { amount: 275500.5 }, leader, NOW);

      const [args] = prisma.offering.upsert.mock.calls[0]! as [{ create: { amount: unknown } }];
      // Binary floating point cannot represent money exactly; an offering
      // that reads 249999.99999 in a report destroys trust in the system.
      expect(args.create.amount).toBeInstanceOf(Prisma.Decimal);
      expect(String(args.create.amount)).toBe('275500.5');
    });

    it('exposes the amount as a plain number for the client', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ offering: buildOffering({ amount: new Prisma.Decimal('275500.50') }) }),
      );

      const report = await service.getReport('meeting-1', leader, NOW);

      expect(report.offering?.amount).toBe(275500.5);
    });
  });

  describe('removeOffering', () => {
    it('soft-deletes so RN-042 keeps the movement traceable', async () => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting({ offering: buildOffering() }));

      await service.removeOffering('meeting-1', leader, NOW);

      const [args] = prisma.offering.update.mock.calls[0]! as [{ data: Record<string, unknown> }];
      expect(args.data).toMatchObject({ deletedAt: NOW, deletedBy: leader.sub });
    });

    it('fails with 404 when there was no offering to begin with', async () => {
      await expect(service.removeOffering('meeting-1', leader, NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('Fotografías (RN-043 / RN-044)', () => {
    it('appends at the end of the gallery when no order is given', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ photos: [buildPhoto(), buildPhoto({ id: 'photo-2' })] }),
      );

      await service.addPhoto('meeting-1', { path: 'tres.jpg' }, leader, NOW);

      const [args] = prisma.meetingPhoto.create.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(args.data.sortOrder).toBe(2);
    });

    it('hides a photograph with a timestamp instead of deleting it', async () => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting({ photos: [buildPhoto()] }));

      await service.updatePhoto('meeting-1', 'photo-1', { hidden: true }, leader, NOW);

      const [args] = prisma.meetingPhoto.update.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toMatchObject({ hiddenAt: NOW, hiddenBy: leader.sub });
    });

    it('restores a hidden photograph by clearing both fields', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ photos: [buildPhoto({ hiddenAt: NOW, hiddenBy: 'someone' })] }),
      );

      await service.updatePhoto('meeting-1', 'photo-1', { hidden: false }, leader, NOW);

      const [args] = prisma.meetingPhoto.update.mock.calls[0]! as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toMatchObject({ hiddenAt: null, hiddenBy: null });
    });

    it('keeps a hidden photograph in the response, flagged', async () => {
      prisma.meeting.findFirst.mockResolvedValue(
        buildMeeting({ photos: [buildPhoto({ hiddenAt: NOW })] }),
      );

      const report = await service.getReport('meeting-1', leader, NOW);

      // RN-044: never destroyed, only taken out of the gallery — which the
      // client can only honour if the row still reaches it.
      expect(report.photos).toHaveLength(1);
      expect(report.photos[0]!.hidden).toBe(true);
    });

    it('rejects a photograph id belonging to another meeting', async () => {
      prisma.meeting.findFirst.mockResolvedValue(buildMeeting({ photos: [buildPhoto()] }));

      await expect(
        service.updatePhoto('meeting-1', 'photo-de-otra', { caption: 'x' }, leader, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
