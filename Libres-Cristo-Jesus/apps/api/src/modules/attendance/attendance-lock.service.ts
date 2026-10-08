import { Injectable } from '@nestjs/common';
import { RoleName } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { endOfIsoWeek, isSameIsoWeek } from './domain/iso-week';

/** doc11 RN-407: a reopening lasts 7 calendar days, then locks again. */
export const UNLOCK_DURATION_DAYS = 7;

export type LockReason =
  /** The meeting belongs to the current ISO week. */
  | 'current-week'
  /** A past meeting, but the caller is not restricted by the lock. */
  | 'role-exempt'
  /** A past meeting with a valid, unexpired reopening. */
  | 'unlocked'
  /** A past meeting, no reopening in force. */
  | 'past-week';

export interface LockState {
  editable: boolean;
  reason: LockReason;
  /** When the meeting closes for a Líder — Sunday 23:59:59.999 of its week. */
  editableUntil: Date | null;
  /** Expiry of the reopening currently in force, when there is one. */
  unlockedUntil: Date | null;
}

/**
 * Decides whether an attendance sheet may still be edited
 * (doc11 RN-407 / RN-503).
 *
 * THE LOCK IS DERIVED, NEVER STORED.
 * "The previous week's meeting is locked" is computed from the meeting's
 * ISO week against today. A stored `isLocked` flag would need a weekly job,
 * and a job that fails to run leaves every meeting editable forever — a
 * silent, retroactive bug. Nothing to schedule means nothing to fail.
 *
 * What IS stored is the exception: a `MeetingUnlock` row, because RN-407
 * asks for traceability of who reopened, when and why.
 *
 * The three rules, in the order they are evaluated:
 *   1. Same ISO week as today  -> editable by anyone who may register.
 *   2. Administrador / Pastor de Distrito -> never blocked by the calendar
 *      (they are the ones who can reopen, so blocking them would be
 *      circular).
 *   3. Otherwise -> editable only while an unexpired reopening exists.
 */
@Injectable()
export class AttendanceLockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Roles the weekly lock does not apply to (doc11 RN-407). */
  private static readonly EXEMPT_ROLES: readonly RoleName[] = [
    RoleName.ADMIN,
    RoleName.DISTRICT_PASTOR,
  ];

  /**
   * Resolves the lock state of one meeting for one actor.
   *
   * `now` is injectable so tests can place themselves at a boundary
   * instead of waiting for a Monday.
   */
  async getLockState(
    meetingId: string,
    meetingDate: Date,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<LockState> {
    // Sunday 23:59:59.999 of the meeting's own ISO week.
    const editableUntil = endOfIsoWeek(meetingDate);

    if (isSameIsoWeek(meetingDate, now)) {
      return { editable: true, reason: 'current-week', editableUntil, unlockedUntil: null };
    }

    if (AttendanceLockService.EXEMPT_ROLES.includes(actor.role)) {
      return { editable: true, reason: 'role-exempt', editableUntil, unlockedUntil: null };
    }

    const unlock = await this.findActiveUnlock(meetingId, now);

    if (unlock) {
      return {
        editable: true,
        reason: 'unlocked',
        editableUntil,
        unlockedUntil: unlock.expiresAt,
      };
    }

    return { editable: false, reason: 'past-week', editableUntil, unlockedUntil: null };
  }

  /**
   * The reopening currently in force, if any.
   *
   * A reopening counts only while it is neither revoked nor expired — and
   * a null `expiresAt` is treated as still valid, so a future policy change
   * to open-ended reopenings does not silently lock everything.
   */
  async findActiveUnlock(
    meetingId: string,
    now: Date = new Date(),
  ): Promise<{ id: string; expiresAt: Date | null } | null> {
    return this.prisma.meetingUnlock.findFirst({
      where: {
        meetingId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { unlockedAt: 'desc' },
      select: { id: true, expiresAt: true },
    });
  }

  /** Expiry of a reopening created now (doc11 RN-407: 7 calendar days). */
  static expiryFrom(now: Date = new Date()): Date {
    const expires = new Date(now.getTime());
    expires.setUTCDate(expires.getUTCDate() + UNLOCK_DURATION_DAYS);
    return expires;
  }

  /** Only these roles may reopen a locked meeting (doc11 RN-407). */
  static canUnlock(role: RoleName): boolean {
    return role === RoleName.ADMIN || role === RoleName.DISTRICT_PASTOR;
  }
}
