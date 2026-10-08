import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  REQUIRE_PERMISSION_KEY,
  ScopeResourceType,
  type RequirePermissionMetadata,
} from '../decorators/require-permission.decorator';
import type { RequestWithUser } from './jwt-auth.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Generic, reusable guard implementing doc05's full "Rol -> Permisos ->
 * Policies" authorization model — the part `RolesGuard` explicitly
 * leaves out ("scope is future business logic"). Two independent checks,
 * both driven by a single `@RequirePermission(resource, action, options)`
 * decorator:
 *
 * (a) Permission: does the authenticated user's role have this
 *     `(resource, action)` permission at all, per `RolePermission`?
 *     `CatRole.name` stores the Spanish label (e.g. "Líder"), while the
 *     JWT payload carries the English `RoleName` enum — `ROLE_NAME_LABELS`
 *     is the single source of truth translating one into the other
 *     (matches the convention `TokenService`/`jwt-payload.interface.ts`
 *     already document).
 *
 * (b) Scope (doc05 "Policies" 1-4): for routes that target a single
 *     resource (declared via `options.scopeType`), does that resource
 *     fall within the user's own scope?
 *       - Policy 1: LEADER -> only their own Casa de Paz
 *         (`PeaceHouse.leadershipUnitId === user.sub`).
 *       - Policy 2: DISTRICT_PASTOR -> only their own District
 *         (`District.leadershipUnitId === user.sub`), and transitively
 *         the Casas de Paz within it. LEADER also gets District scope,
 *         but narrower: only the District their own Casa de Paz belongs
 *         to (`district:read`/`district:list` are granted to LEADER —
 *         see `prisma/seed.ts` — so this guard must actually let them
 *         resolve that District instead of blanket-rejecting).
 *       - Policies 3-4: GENERAL_PASTOR/ADMIN -> unrestricted, no scope
 *         check at all.
 *
 * A route with no `@RequirePermission(...)` metadata is allowed through
 * unconditionally, exactly like `RolesGuard` with no `@Roles(...)` — this
 * guard only narrows access. No business module wires this guard to a
 * real route yet; it only exists so future modules (Districts, Casas de
 * Paz, ...) can opt in with a single decorator.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequirePermissionMetadata | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user required');
    }

    await this.checkPermission(user, metadata);
    await this.checkScope(request, user, metadata);

    return true;
  }

  private async checkPermission(
    user: JwtPayload,
    metadata: RequirePermissionMetadata,
  ): Promise<void> {
    const roleLabel = ROLE_NAME_LABELS[user.role];

    const grant = await this.prisma.rolePermission.findFirst({
      where: {
        role: { name: roleLabel },
        permission: { resource: metadata.resource, action: metadata.action },
      },
      select: { id: true },
    });

    if (!grant) {
      throw new ForbiddenException('Insufficient permission for this action');
    }
  }

  private async checkScope(
    request: RequestWithUser,
    user: JwtPayload,
    metadata: RequirePermissionMetadata,
  ): Promise<void> {
    // Policies 3-4: Pastor General / Administrador have unrestricted scope.
    if (user.role === RoleName.GENERAL_PASTOR || user.role === RoleName.ADMIN) {
      return;
    }

    // No single target resource declared (e.g. list/create endpoints) —
    // nothing to scope-check.
    if (!metadata.scopeType) {
      return;
    }

    const paramName = metadata.paramName ?? 'id';
    const rawResourceId = request.params?.[paramName];
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;

    if (!resourceId) {
      throw new ForbiddenException('Missing resource identifier for scope check');
    }

    const inScope = await this.isInScope(user, metadata.scopeType, resourceId);

    if (!inScope) {
      throw new ForbiddenException('Resource is outside of your scope');
    }
  }

  private async isInScope(
    user: JwtPayload,
    scopeType: ScopeResourceType,
    resourceId: string,
  ): Promise<boolean> {
    switch (scopeType) {
      case ScopeResourceType.PEACE_HOUSE:
        return this.isPeaceHouseInScope(user, resourceId);
      case ScopeResourceType.DISTRICT:
        return this.isDistrictInScope(user, resourceId);
      case ScopeResourceType.PERSON:
        return this.isPersonInScope(user, resourceId);
      case ScopeResourceType.MEETING:
        return this.isMeetingInScope(user, resourceId);
      case ScopeResourceType.KIDS_SCHOOL:
        return this.isKidsSchoolInScope(user, resourceId);
      case ScopeResourceType.KIDS_CHILD:
        return this.isKidsChildInScope(user, resourceId);
      case ScopeResourceType.KIDS_GUARDIAN:
        return this.isKidsGuardianInScope(user, resourceId);
      case ScopeResourceType.KIDS_MEETING:
        return this.isKidsMeetingInScope(user, resourceId);
      default:
        return false;
    }
  }

  /**
   * A `KidsSchool` is in scope when the actor holds an ACTIVE
   * `KidsUserAssignment` for it — `endDate: null` (open period, same
   * "current" convention as `PeaceHouseLeadershipHistory`) and not
   * soft-deleted.
   *
   * UNLIKE every other resolver in this guard, this is not a single-owner
   * chain: a school has one active KIDS_LEADER and any number of
   * KIDS_ASSISTANTs, all resolved by the same existence check, with no
   * role branching needed — a KidsUserAssignment row for this user on this
   * school is what scope means here, regardless of which of the two Kids
   * roles the actor holds.
   */
  private async isKidsSchoolInScope(user: JwtPayload, kidsSchoolId: string): Promise<boolean> {
    const assignment = await this.prisma.kidsUserAssignment.findFirst({
      where: {
        kidsSchoolId,
        leadershipUnitId: user.sub,
        endDate: null,
        deletedAt: null,
      },
      select: { id: true },
    });

    return assignment !== null;
  }

  /**
   * A `KidsChild` is in scope when its `KidsSchool` is — same indirection as
   * `isMeetingInScope`/`isPersonInScope`. A child that does not exist fails
   * closed (no assignment lookup even attempted).
   */
  private async isKidsChildInScope(user: JwtPayload, kidsChildId: string): Promise<boolean> {
    const child = await this.prisma.kidsChild.findUnique({
      where: { id: kidsChildId },
      select: { kidsSchoolId: true },
    });

    if (!child) {
      return false;
    }

    return this.isKidsSchoolInScope(user, child.kidsSchoolId);
  }

  /**
   * A `KidsGuardian` has no `kidsSchoolId` of its own — it is linked to N
   * children (possibly at different schools) via `KidsChildGuardian`. In
   * scope when the actor has scope over AT LEAST ONE linked child's school.
   * A guardian with no linked children (should not normally happen, but not
   * enforced at the DB level) fails closed.
   */
  private async isKidsGuardianInScope(user: JwtPayload, kidsGuardianId: string): Promise<boolean> {
    const links = await this.prisma.kidsChildGuardian.findMany({
      where: { kidsGuardianId, deletedAt: null },
      select: { kidsChild: { select: { kidsSchoolId: true } } },
    });

    const schoolIds = new Set(links.map((link) => link.kidsChild.kidsSchoolId));

    for (const schoolId of schoolIds) {
      if (await this.isKidsSchoolInScope(user, schoolId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * A `KidsMeeting` is in scope when its `KidsSchool` is — same indirection
   * as `isKidsChildInScope`: every attendance route past "open the week"
   * identifies the week by `meetingId`, not `schoolId`.
   */
  private async isKidsMeetingInScope(user: JwtPayload, kidsMeetingId: string): Promise<boolean> {
    const meeting = await this.prisma.kidsMeeting.findUnique({
      where: { id: kidsMeetingId },
      select: { kidsSchoolId: true },
    });

    if (!meeting) {
      return false;
    }

    return this.isKidsSchoolInScope(user, meeting.kidsSchoolId);
  }

  /**
   * A `Meeting` is in scope when the Casa de Paz that holds it is.
   *
   * WHY THIS EXISTS
   * `POST /attendance/peace-houses/:peaceHouseId/meetings/current` is
   * scoped by the house in its path, but every route after it identifies
   * the week by `meetingId` — mark, mark-all, the report, the offering, the
   * photographs. Without this branch those routes declared no `scopeType`,
   * `checkScope` returned early, and a Líder holding a valid token could
   * write on any Casa de Paz in the country simply by passing its meeting
   * id. The service-level check that the person belonged to the meeting's
   * roster did not help: for the victim house, they do.
   *
   * A meeting whose schedule was deleted resolves to nothing and therefore
   * fails closed, like `isPersonInScope`.
   */
  private async isMeetingInScope(user: JwtPayload, meetingId: string): Promise<boolean> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { meetingSchedule: { select: { peaceHouseId: true } } },
    });

    if (!meeting) {
      return false;
    }

    return this.isPeaceHouseInScope(user, meeting.meetingSchedule.peaceHouseId);
  }

  /** Policy 1 (LEADER: own Casa de Paz) + Policy 2 (DISTRICT_PASTOR: Casas de Paz within their District). */
  private async isPeaceHouseInScope(user: JwtPayload, peaceHouseId: string): Promise<boolean> {
    if (user.role === RoleName.LEADER) {
      const peaceHouse = await this.prisma.peaceHouse.findUnique({
        where: { id: peaceHouseId },
        select: { leadershipUnitId: true },
      });
      return peaceHouse?.leadershipUnitId === user.sub;
    }

    if (user.role === RoleName.DISTRICT_PASTOR) {
      const peaceHouse = await this.prisma.peaceHouse.findUnique({
        where: { id: peaceHouseId },
        select: { district: { select: { leadershipUnitId: true } } },
      });
      return peaceHouse?.district.leadershipUnitId === user.sub;
    }

    return false;
  }

  /**
   * A `Person` is in scope when the Casa de Paz they CURRENTLY belong to
   * is — their open `PersonPeaceHouseHistory` period.
   *
   * WHY OWNERSHIP IS INHERITED AND NOT STORED
   * A person has no leader of their own; they belong to a house, and the
   * house has one. Resolving through the open period keeps the rule true
   * automatically after a transfer: the moment someone moves to another
   * district, their former Pastor de Distrito stops being able to read
   * them, with nothing to update anywhere.
   *
   * A person with NO open period (registered but not yet assigned) is out
   * of scope for every scoped role. That fails closed on purpose: an
   * unassigned person belongs to nobody, so letting the nearest leader
   * read them would be a guess, not a rule.
   */
  private async isPersonInScope(user: JwtPayload, personId: string): Promise<boolean> {
    const membership = await this.prisma.personPeaceHouseHistory.findFirst({
      where: { personId, endDate: null, deletedAt: null },
      select: { peaceHouseId: true },
    });

    if (!membership) {
      return false;
    }

    return this.isPeaceHouseInScope(user, membership.peaceHouseId);
  }

  /**
   * Policy 2: DISTRICT_PASTOR only their own District. LEADER is also
   * allowed, but only for the single District their own Casa de Paz
   * belongs to — resolved via `PeaceHouse`, since a Líder has no
   * `District.leadershipUnitId` of their own.
   */
  private async isDistrictInScope(user: JwtPayload, districtId: string): Promise<boolean> {
    if (user.role === RoleName.DISTRICT_PASTOR) {
      const district = await this.prisma.district.findUnique({
        where: { id: districtId },
        select: { leadershipUnitId: true },
      });
      return district?.leadershipUnitId === user.sub;
    }

    if (user.role === RoleName.LEADER) {
      const ownedPeaceHouse = await this.prisma.peaceHouse.findFirst({
        where: { districtId, leadershipUnitId: user.sub },
        select: { id: true },
      });
      return ownedPeaceHouse !== null;
    }

    return false;
  }
}
