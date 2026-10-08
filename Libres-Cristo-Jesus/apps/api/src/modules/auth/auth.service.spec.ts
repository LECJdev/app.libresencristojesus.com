import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { LeadershipUnitStatus } from '@prisma/client';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { AuthService } from './auth.service';
import { TokenService } from '../../common/security/token.service';
import { hashRefreshToken } from './util/hash-refresh-token.util';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { AppConfigService } from '../../common/config/app-config.service';

const ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
const REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';

const meta = { ip: '127.0.0.1', browser: 'jest-test-agent' };

function buildUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-1',
    type: 'Líder',
    photo: null,
    roleId: 'role-leader',
    role: { id: 'role-leader', name: ROLE_NAME_LABELS[RoleName.LEADER] },
    status: LeadershipUnitStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    members: [],
    ...overrides,
  };
}

/**
 * A `LeadershipMember` as `AuthService` fetches it — the couple's shared
 * `LeadershipUnit` (and its own `members` list, for `me`/`login`'s
 * `AuthenticatedUserDto.members`) nested underneath, since credentials
 * moved from Unit to Member.
 */
function buildMember(
  memberOverrides: Record<string, unknown> = {},
  unitOverrides: Record<string, unknown> = {},
) {
  return {
    id: 'member-1',
    leadershipUnitId: 'unit-1',
    firstName: 'Carlos',
    lastName: 'Pérez',
    gender: 'M',
    phone: null,
    email: null,
    photo: null,
    birthDate: null,
    username: 'lider.carlos',
    passwordHash: '',
    mustChangePassword: false,
    ...memberOverrides,
    leadershipUnit: buildUnit(unitOverrides),
  };
}

interface UserSessionCreateArgs {
  data: {
    leadershipMemberId: string;
    refreshToken: string;
    ip?: string | null;
    browser?: string | null;
    device?: string | null;
  };
}

describe('AuthService', () => {
  let tokenService: TokenService;
  let prisma: {
    leadershipMember: { findUnique: jest.Mock };
    userSession: {
      create: jest.Mock<Promise<void>, [UserSessionCreateArgs]>;
      findFirst: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let authService: AuthService;
  let correctPasswordHash: string;

  beforeAll(async () => {
    correctPasswordHash = await argon2.hash('Correct-Password1!');
  });

  beforeEach(() => {
    const configServiceStub = {
      jwtSecret: ACCESS_SECRET,
      jwtRefreshSecret: REFRESH_SECRET,
    } as unknown as AppConfigService;
    tokenService = new TokenService(new JwtService(), configServiceStub);

    prisma = {
      leadershipMember: { findUnique: jest.fn() },
      userSession: {
        create: jest.fn<Promise<void>, [UserSessionCreateArgs]>().mockResolvedValue(undefined),
        findFirst: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    authService = new AuthService(prisma as unknown as PrismaService, tokenService);
  });

  describe('login', () => {
    it('succeeds with correct credentials and creates a session', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(
        buildMember({ passwordHash: correctPasswordHash }),
      );

      const result = await authService.login(
        { username: 'lider.carlos', password: 'Correct-Password1!' },
        meta,
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toMatchObject({
        id: 'unit-1',
        username: 'lider.carlos',
        role: RoleName.LEADER,
      });
      expect(result.user).not.toHaveProperty('passwordHash');

      const [createArgs] = prisma.userSession.create.mock.calls[0] ?? [];
      expect(createArgs?.data.leadershipMemberId).toBe('member-1');
      expect(createArgs?.data.refreshToken).toBe(hashRefreshToken(result.refreshToken));
      expect(createArgs?.data.ip).toBe(meta.ip);
      expect(createArgs?.data.browser).toBe(meta.browser);

      const decodedAccess = tokenService.verifyAccessToken(result.accessToken);
      expect(decodedAccess).toMatchObject({
        sub: 'unit-1',
        memberId: 'member-1',
        role: RoleName.LEADER,
      });
    });

    it('rejects a wrong password with a generic message', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(
        buildMember({ passwordHash: correctPasswordHash }),
      );

      await expect(
        authService.login({ username: 'lider.carlos', password: 'wrong-password' }, meta),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent username with the SAME generic message as a wrong password', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(null);

      let nonexistentMessage = '';
      let wrongPasswordMessage = '';

      try {
        await authService.login({ username: 'ghost', password: 'anything' }, meta);
      } catch (error) {
        nonexistentMessage = (error as UnauthorizedException).message;
      }

      prisma.leadershipMember.findUnique.mockResolvedValue(
        buildMember({ passwordHash: correctPasswordHash }),
      );
      try {
        await authService.login({ username: 'lider.carlos', password: 'wrong' }, meta);
      } catch (error) {
        wrongPasswordMessage = (error as UnauthorizedException).message;
      }

      expect(nonexistentMessage).not.toBe('');
      expect(nonexistentMessage).toBe(wrongPasswordMessage);
    });

    it('rejects an inactive account with a distinct message, only after the password checks out', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(
        buildMember(
          { passwordHash: correctPasswordHash },
          { status: LeadershipUnitStatus.INACTIVE },
        ),
      );

      await expect(
        authService.login({ username: 'lider.carlos', password: 'Correct-Password1!' }, meta),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login({ username: 'lider.carlos', password: 'Correct-Password1!' }, meta),
      ).rejects.toThrow('Account is inactive');
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rotates a valid refresh token: old session deleted, new session created, new tokens returned', async () => {
      const payload = {
        sub: 'unit-1',
        memberId: 'member-1',
        username: 'lider.carlos',
        role: RoleName.LEADER,
      };
      const oldRefreshToken = tokenService.signRefreshToken(payload);

      prisma.userSession.findFirst.mockResolvedValue({
        id: 'session-1',
        leadershipMemberId: 'member-1',
        refreshToken: hashRefreshToken(oldRefreshToken),
        ip: '10.0.0.1',
        browser: 'old-agent',
        device: null,
      });
      prisma.leadershipMember.findUnique.mockResolvedValue(buildMember());

      const result = await authService.refresh(oldRefreshToken);

      // Note: this does NOT assert `result.refreshToken !== oldRefreshToken`
      // by string equality — a JWT's `iat` claim has second-level
      // granularity, so two tokens signed for the same payload within the
      // same second are byte-identical, making that comparison flaky.
      // What actually matters for rotation is asserted below: the OLD
      // session row is deleted and a NEW one is created bound to the hash
      // of whatever `refreshToken` this call returns.
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.userSession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
      const [createArgs] = prisma.userSession.create.mock.calls[0] ?? [];
      expect(createArgs?.data.leadershipMemberId).toBe('member-1');
      expect(createArgs?.data.refreshToken).toBe(hashRefreshToken(result.refreshToken));

      const decoded = tokenService.verifyRefreshToken(result.refreshToken);
      expect(decoded).toMatchObject({ sub: 'unit-1' });
    });

    it('rejects a malformed/invalid refresh token', async () => {
      await expect(authService.refresh('not-a-real-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.userSession.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
      const rawJwtService = new JwtService();
      const expiredToken = rawJwtService.sign(
        { sub: 'unit-1', username: 'lider.carlos', role: RoleName.LEADER },
        { secret: REFRESH_SECRET, expiresIn: '-10s' },
      );

      await expect(authService.refresh(expiredToken)).rejects.toThrow(UnauthorizedException);
      expect(prisma.userSession.findFirst).not.toHaveBeenCalled();
    });

    it('rejects (and revokes all sessions for the member) when a valid-signature token has already been rotated/reused', async () => {
      const payload = {
        sub: 'unit-1',
        memberId: 'member-1',
        username: 'lider.carlos',
        role: RoleName.LEADER,
      };
      const reusedToken = tokenService.signRefreshToken(payload);

      // No session matches this hash anymore — it was already rotated away.
      prisma.userSession.findFirst.mockResolvedValue(null);

      await expect(authService.refresh(reusedToken)).rejects.toThrow(UnauthorizedException);
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { leadershipMemberId: 'member-1' },
      });
      expect(prisma.userSession.delete).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes exactly the session matching the presented refresh token for that member', async () => {
      const refreshToken = 'some-refresh-token-value';

      await authService.logout(refreshToken, 'member-1');

      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { leadershipMemberId: 'member-1', refreshToken: hashRefreshToken(refreshToken) },
      });
    });
  });

  describe('me', () => {
    it('returns the authenticated profile without passwordHash', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(
        buildMember(
          { passwordHash: correctPasswordHash },
          {
            members: [
              {
                id: 'member-1',
                firstName: 'Carlos',
                lastName: 'Pérez',
                gender: 'M',
                phone: null,
                email: null,
                photo: null,
                birthDate: null,
              },
            ],
          },
        ),
      );

      const result = await authService.me('member-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({
        id: 'unit-1',
        username: 'lider.carlos',
        role: RoleName.LEADER,
      });
      expect(result.members).toHaveLength(1);
    });

    it('rejects when the LeadershipMember no longer exists', async () => {
      prisma.leadershipMember.findUnique.mockResolvedValue(null);

      await expect(authService.me('deleted-member')).rejects.toThrow(UnauthorizedException);
    });
  });
});
