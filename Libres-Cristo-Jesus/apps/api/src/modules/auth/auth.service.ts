import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { LeadershipUnitStatus, type Prisma } from '@prisma/client';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../../common/security/token.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { hashRefreshToken } from './util/hash-refresh-token.util';
import type { LoginDto } from './dto/login.dto';
import type { AuthenticatedUserDto } from './dto/authenticated-user.dto';

/** Never reveals whether the username exists or the password was wrong. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const INACTIVE_ACCOUNT_MESSAGE = 'Account is inactive';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Refresh token is invalid, expired, or already used';

export interface SessionMeta {
  ip: string | null;
  /** Raw `User-Agent` header — stored as-is, no UA parsing library in scope for this phase. */
  browser: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserDto;
  /**
   * The `LeadershipMember.id` that authenticated. Service-internal only —
   * never serialized in the HTTP response body (`AuthenticatedUserDto` has
   * no such field); the controller needs it solely to populate the
   * synthetic `request.user` used by `AuditInterceptor` on this
   * `@Public()` route.
   */
  memberId: string;
}

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
}

type LeadershipUnitWithRoleAndMembers = Prisma.LeadershipUnitGetPayload<{
  include: { role: true; members: true };
}>;

/**
 * Auth module business logic (`Documentos/19` section 2, `Documentos/21`
 * section 4, `Documentos/05-roles-y-permisos.md`). Reuses `TokenService`
 * for all JWT signing/verification — this class never signs/verifies a
 * token itself, only decides *when* to.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, meta: SessionMeta): Promise<LoginResult> {
    const member = await this.prisma.leadershipMember.findUnique({
      where: { username: dto.username },
      include: { leadershipUnit: { include: { role: true, members: true } } },
    });

    // Same generic message whether the username doesn't exist or the
    // password is wrong — never reveal which, to avoid username
    // enumeration (task brief / general auth best practice; not spelled
    // out verbatim in doc19/doc21 but consistent with doc21's security
    // posture).
    if (!member || !(await argon2.verify(member.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const unit = member.leadershipUnit;

    // Checked only *after* the password has already been verified, so
    // this distinct message can never be used to enumerate usernames
    // without already knowing a valid password for them. Governs the
    // whole couple (see `LeadershipUnit.status` comment in schema.prisma)
    // — a suspended/retired unit blocks login even with valid member
    // credentials.
    if (unit.status !== LeadershipUnitStatus.ACTIVE) {
      throw new UnauthorizedException(INACTIVE_ACCOUNT_MESSAGE);
    }

    const role = this.resolveRoleName(unit.role.name);
    const payload: JwtPayload = {
      sub: unit.id,
      memberId: member.id,
      username: member.username,
      role,
    };

    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    await this.prisma.userSession.create({
      data: {
        leadershipMemberId: member.id,
        refreshToken: hashRefreshToken(refreshToken),
        ip: meta.ip,
        browser: meta.browser,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toAuthenticatedUser(unit, member.username, role),
      memberId: member.id,
    };
  }

  /**
   * Rotates a refresh token: the presented token must match a live
   * `UserSession`, which is then deleted and replaced by a brand new one
   * bound to a brand new refresh token — the old token can never be used
   * again after this call succeeds.
   *
   * Reuse detection: a refresh token that verifies (valid signature, not
   * expired) but no longer matches any stored session hash means it was
   * already rotated away and is being replayed — the classic signal of a
   * stolen refresh token. The defensive response is to revoke every
   * session for that LeadershipMember (the individual who authenticated,
   * not their whole LeadershipUnit — each member now has an independent
   * account, so a compromised member's tokens should not force the other
   * member of the couple to re-login), forcing a fresh login for them.
   *
   * `refreshToken` arrives as a plain string, not a validated DTO — the
   * token now travels exclusively as an httpOnly cookie (never a JSON
   * body), so the controller reads it straight off `req.cookies` and
   * passes it through. `class-validator` has nothing to validate here.
   */
  async refresh(refreshToken: string): Promise<TokenPairResult> {
    let presentedPayload: JwtPayload;
    try {
      presentedPayload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const presentedHash = hashRefreshToken(refreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { leadershipMemberId: presentedPayload.memberId, refreshToken: presentedHash },
    });

    if (!session) {
      await this.prisma.userSession.deleteMany({
        where: { leadershipMemberId: presentedPayload.memberId },
      });
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const member = await this.prisma.leadershipMember.findUnique({
      where: { id: presentedPayload.memberId },
      include: { leadershipUnit: { include: { role: true } } },
    });

    if (!member || member.leadershipUnit.status !== LeadershipUnitStatus.ACTIVE) {
      await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException(INACTIVE_ACCOUNT_MESSAGE);
    }

    const unit = member.leadershipUnit;
    const role = this.resolveRoleName(unit.role.name);
    const newPayload: JwtPayload = {
      sub: unit.id,
      memberId: member.id,
      username: member.username,
      role,
    };
    const accessToken = this.tokenService.signAccessToken(newPayload);
    const newRefreshToken = this.tokenService.signRefreshToken(newPayload);

    await this.prisma.$transaction([
      this.prisma.userSession.delete({ where: { id: session.id } }),
      this.prisma.userSession.create({
        data: {
          leadershipMemberId: member.id,
          refreshToken: hashRefreshToken(newRefreshToken),
          ip: session.ip,
          browser: session.browser,
          device: session.device,
        },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Invalidates exactly the session the presented refresh token belongs
   * to. `UserSession` (schema.prisma) is a technical/short-lived table
   * that intentionally does NOT follow the "tabla principal" convention —
   * it carries no `deletedAt`/`status` field at all — so invalidation
   * here is a real row delete, not a soft-delete flag flip.
   *
   * `refreshToken` is a plain string for the same reason as in `refresh`
   * above — it comes from the httpOnly cookie, not a validated body DTO.
   */
  async logout(refreshToken: string, memberId: string): Promise<void> {
    const presentedHash = hashRefreshToken(refreshToken);
    await this.prisma.userSession.deleteMany({
      where: { leadershipMemberId: memberId, refreshToken: presentedHash },
    });
  }

  async me(memberId: string): Promise<AuthenticatedUserDto> {
    const member = await this.prisma.leadershipMember.findUnique({
      where: { id: memberId },
      include: { leadershipUnit: { include: { role: true, members: true } } },
    });

    if (!member) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const role = this.resolveRoleName(member.leadershipUnit.role.name);
    return this.toAuthenticatedUser(member.leadershipUnit, member.username, role);
  }

  /**
   * `CatRole.name` stores the Spanish label seeded from
   * `ROLE_NAME_LABELS` (`packages/types/src/role.ts`), while the JWT
   * payload/API need the English `RoleName` enum — this is the single
   * place that translates DB row -> code enum. An unmatched label means
   * the `CatRole` catalog was seeded/edited inconsistently with
   * `ROLE_NAME_LABELS`; that's a data-integrity bug, not a credentials
   * problem, so it deliberately does NOT throw `UnauthorizedException`
   * and instead falls through to `AllExceptionsFilter`'s generic 500.
   */
  private resolveRoleName(catRoleName: string): RoleName {
    const match = (Object.entries(ROLE_NAME_LABELS) as [RoleName, string][]).find(
      ([, label]) => label === catRoleName,
    );

    if (!match) {
      throw new Error(`CatRole.name "${catRoleName}" does not match any known RoleName label`);
    }

    return match[0];
  }

  /**
   * `username` is the logged-in `LeadershipMember`'s own username, passed
   * in by the caller — `LeadershipUnit` no longer has one of its own (see
   * schema.prisma). `members` below still lists the whole couple, per
   * confirmed design: identity (`id`/`username`) is per-member, but scope
   * (district/Casa de Paz ownership) and the visible roster stay
   * unit-wide.
   */
  private toAuthenticatedUser(
    unit: LeadershipUnitWithRoleAndMembers,
    username: string,
    role: RoleName,
  ): AuthenticatedUserDto {
    return {
      id: unit.id,
      username,
      type: unit.type,
      photo: unit.photo,
      role,
      status: unit.status,
      members: unit.members.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        phone: member.phone,
        email: member.email,
        photo: member.photo,
        birthDate: member.birthDate,
      })),
    };
  }
}
