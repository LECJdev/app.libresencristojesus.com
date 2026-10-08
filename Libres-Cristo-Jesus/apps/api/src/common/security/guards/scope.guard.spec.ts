import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@lcj/types';
import { ScopeGuard } from './scope.guard';
import { RequirePermission, ScopeResourceType } from '../decorators/require-permission.decorator';
import type { RequestWithUser } from './jwt-auth.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { PrismaService } from '../../prisma/prisma.service';

function createContext(request: Partial<RequestWithUser>, handler: () => void): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

function plainHandler(): void {
  /* no-op */
}

class ListDistrictsController {
  @RequirePermission('district', 'list')
  handler(this: void): void {
    /* no-op */
  }
}

class UpdatePeaceHouseController {
  @RequirePermission('peaceHouse', 'update', { scopeType: ScopeResourceType.PEACE_HOUSE })
  handler(this: void): void {
    /* no-op */
  }
}

class UpdateDistrictController {
  @RequirePermission('district', 'update', { scopeType: ScopeResourceType.DISTRICT })
  handler(this: void): void {
    /* no-op */
  }
}

class UpdateKidsSchoolController {
  @RequirePermission('kids-school', 'read', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  handler(this: void): void {
    /* no-op */
  }
}

class UpdateKidsChildController {
  @RequirePermission('kids-child', 'update', { scopeType: ScopeResourceType.KIDS_CHILD })
  handler(this: void): void {
    /* no-op */
  }
}

class UpdateKidsGuardianController {
  @RequirePermission('kids-guardian', 'update', { scopeType: ScopeResourceType.KIDS_GUARDIAN })
  handler(this: void): void {
    /* no-op */
  }
}

class UpdateKidsMeetingController {
  @RequirePermission('kids-attendance', 'read', {
    scopeType: ScopeResourceType.KIDS_MEETING,
    paramName: 'meetingId',
  })
  handler(this: void): void {
    /* no-op */
  }
}

const leaderUser: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'leader',
  role: RoleName.LEADER,
};
const districtPastorUser: JwtPayload = {
  sub: 'unit-district-pastor',
  memberId: 'member-district-pastor',
  username: 'district-pastor',
  role: RoleName.DISTRICT_PASTOR,
};
const generalPastorUser: JwtPayload = {
  sub: 'unit-general-pastor',
  memberId: 'member-general-pastor',
  username: 'general-pastor',
  role: RoleName.GENERAL_PASTOR,
};
const adminUser: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};
const kidsLeaderUser: JwtPayload = {
  sub: 'unit-kids-leader',
  memberId: 'member-kids-leader',
  username: 'kids-leader',
  role: RoleName.KIDS_LEADER,
};
const kidsAssistantUser: JwtPayload = {
  sub: 'unit-kids-assistant',
  memberId: 'member-kids-assistant',
  username: 'kids-assistant',
  role: RoleName.KIDS_ASSISTANT,
};

describe('ScopeGuard', () => {
  let rolePermissionFindFirst: jest.Mock;
  let peaceHouseFindUnique: jest.Mock;
  let peaceHouseFindFirst: jest.Mock;
  let districtFindUnique: jest.Mock;
  let kidsUserAssignmentFindFirst: jest.Mock;
  let kidsChildFindUnique: jest.Mock;
  let kidsChildGuardianFindMany: jest.Mock;
  let kidsMeetingFindUnique: jest.Mock;
  let guard: ScopeGuard;

  beforeEach(() => {
    rolePermissionFindFirst = jest.fn().mockResolvedValue({ id: 'grant-1' });
    peaceHouseFindUnique = jest.fn();
    peaceHouseFindFirst = jest.fn().mockResolvedValue(null);
    districtFindUnique = jest.fn();
    kidsUserAssignmentFindFirst = jest.fn();
    kidsChildFindUnique = jest.fn();
    kidsChildGuardianFindMany = jest.fn();
    kidsMeetingFindUnique = jest.fn();

    const prismaStub = {
      rolePermission: { findFirst: rolePermissionFindFirst },
      peaceHouse: { findUnique: peaceHouseFindUnique, findFirst: peaceHouseFindFirst },
      district: { findUnique: districtFindUnique },
      kidsUserAssignment: { findFirst: kidsUserAssignmentFindFirst },
      kidsChild: { findUnique: kidsChildFindUnique },
      kidsChildGuardian: { findMany: kidsChildGuardianFindMany },
      kidsMeeting: { findUnique: kidsMeetingFindUnique },
    } as unknown as PrismaService;

    guard = new ScopeGuard(new Reflector(), prismaStub);
  });

  it('allows any authenticated user when no @RequirePermission() is set', async () => {
    const request: Partial<RequestWithUser> = { user: leaderUser, params: {} };
    await expect(guard.canActivate(createContext(request, plainHandler))).resolves.toBe(true);
    expect(rolePermissionFindFirst).not.toHaveBeenCalled();
  });

  it('rejects when permission is required but no user is present on the request', async () => {
    const request: Partial<RequestWithUser> = { params: {} };
    await expect(
      guard.canActivate(createContext(request, ListDistrictsController.prototype.handler)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when the role has no matching RolePermission grant', async () => {
    rolePermissionFindFirst.mockResolvedValue(null);
    const request: Partial<RequestWithUser> = { user: leaderUser, params: {} };
    await expect(
      guard.canActivate(createContext(request, ListDistrictsController.prototype.handler)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a permitted action with no scopeType (list/create-style route) without a scope query', async () => {
    const request: Partial<RequestWithUser> = { user: districtPastorUser, params: {} };
    await expect(
      guard.canActivate(createContext(request, ListDistrictsController.prototype.handler)),
    ).resolves.toBe(true);
    expect(peaceHouseFindUnique).not.toHaveBeenCalled();
    expect(districtFindUnique).not.toHaveBeenCalled();
  });

  describe('Policy 1 — LEADER scoped to their own Casa de Paz', () => {
    it('allows a Líder to act on the Casa de Paz they lead', async () => {
      peaceHouseFindUnique.mockResolvedValue({ leadershipUnitId: leaderUser.sub });
      const request: Partial<RequestWithUser> = {
        user: leaderUser,
        params: { id: 'house-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
      ).resolves.toBe(true);
    });

    it('rejects a Líder acting on a different Casa de Paz', async () => {
      peaceHouseFindUnique.mockResolvedValue({ leadershipUnitId: 'someone-elses-unit' });
      const request: Partial<RequestWithUser> = {
        user: leaderUser,
        params: { id: 'house-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Policy 2 — DISTRICT_PASTOR scoped to their own District and its Casas de Paz', () => {
    it('allows a Pastor de Distrito to act on their own District', async () => {
      districtFindUnique.mockResolvedValue({ leadershipUnitId: districtPastorUser.sub });
      const request: Partial<RequestWithUser> = {
        user: districtPastorUser,
        params: { id: 'district-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateDistrictController.prototype.handler)),
      ).resolves.toBe(true);
    });

    it('rejects a Pastor de Distrito acting on a different District', async () => {
      districtFindUnique.mockResolvedValue({ leadershipUnitId: 'someone-elses-unit' });
      const request: Partial<RequestWithUser> = {
        user: districtPastorUser,
        params: { id: 'district-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateDistrictController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a Pastor de Distrito to act on a Casa de Paz within their District', async () => {
      peaceHouseFindUnique.mockResolvedValue({
        district: { leadershipUnitId: districtPastorUser.sub },
      });
      const request: Partial<RequestWithUser> = {
        user: districtPastorUser,
        params: { id: 'house-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
      ).resolves.toBe(true);
    });

    it('rejects a Pastor de Distrito acting on a Casa de Paz outside their District', async () => {
      peaceHouseFindUnique.mockResolvedValue({
        district: { leadershipUnitId: 'someone-elses-unit' },
      });
      const request: Partial<RequestWithUser> = {
        user: districtPastorUser,
        params: { id: 'house-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a Líder to act on the District their own Casa de Paz belongs to', async () => {
      peaceHouseFindFirst.mockResolvedValue({ id: 'house-1' });
      const request: Partial<RequestWithUser> = {
        user: leaderUser,
        params: { id: 'district-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateDistrictController.prototype.handler)),
      ).resolves.toBe(true);
      expect(peaceHouseFindFirst).toHaveBeenCalledWith({
        where: { districtId: 'district-1', leadershipUnitId: leaderUser.sub },
        select: { id: true },
      });
      expect(districtFindUnique).not.toHaveBeenCalled();
    });

    it('rejects a Líder targeting a District their Casa de Paz does not belong to', async () => {
      peaceHouseFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: leaderUser,
        params: { id: 'district-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateDistrictController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
      expect(districtFindUnique).not.toHaveBeenCalled();
    });
  });

  describe('Policies 3-4 — GENERAL_PASTOR/ADMIN unrestricted', () => {
    it('allows a Pastor General onto any Casa de Paz without a scope query', async () => {
      const request: Partial<RequestWithUser> = {
        user: generalPastorUser,
        params: { id: 'house-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
      ).resolves.toBe(true);
      expect(peaceHouseFindUnique).not.toHaveBeenCalled();
    });

    it('allows an Administrador onto any District without a scope query', async () => {
      const request: Partial<RequestWithUser> = {
        user: adminUser,
        params: { id: 'district-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateDistrictController.prototype.handler)),
      ).resolves.toBe(true);
      expect(districtFindUnique).not.toHaveBeenCalled();
    });
  });

  it('rejects when the scoped resource id is missing from the route params', async () => {
    const request: Partial<RequestWithUser> = { user: leaderUser, params: {} };
    await expect(
      guard.canActivate(createContext(request, UpdatePeaceHouseController.prototype.handler)),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('KIDS_SCHOOL — resolved via KidsUserAssignment (many-to-many, unlike every other scope kind)', () => {
    it('allows a KIDS_LEADER with an active assignment to the school', async () => {
      kidsUserAssignmentFindFirst.mockResolvedValue({ id: 'assignment-1' });
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'school-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsUserAssignmentFindFirst).toHaveBeenCalledWith({
        where: {
          kidsSchoolId: 'school-1',
          leadershipUnitId: kidsLeaderUser.sub,
          endDate: null,
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('allows a KIDS_ASSISTANT with an active assignment to the school', async () => {
      kidsUserAssignmentFindFirst.mockResolvedValue({ id: 'assignment-2' });
      const request: Partial<RequestWithUser> = {
        user: kidsAssistantUser,
        params: { id: 'school-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).resolves.toBe(true);
    });

    it('rejects a KIDS_ASSISTANT with no assignment to the school (cross-school access)', async () => {
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsAssistantUser,
        params: { id: 'school-2' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a KIDS_LEADER whose assignment to the school already ended', async () => {
      // A closed assignment (endDate set) never matches the query below —
      // simulated here by the mock returning null, exactly as Postgres would.
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'school-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a Casas de Paz LEADER with no KidsUserAssignment at all', async () => {
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: leaderUser,
        params: { id: 'school-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an Administrador onto any Kids school without a scope query', async () => {
      const request: Partial<RequestWithUser> = {
        user: adminUser,
        params: { id: 'school-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsSchoolController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsUserAssignmentFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('KIDS_CHILD — resolved indirectly through the child\'s KidsSchool', () => {
    it('allows a KIDS_LEADER with scope over the child\'s school', async () => {
      kidsChildFindUnique.mockResolvedValue({ kidsSchoolId: 'school-1' });
      kidsUserAssignmentFindFirst.mockResolvedValue({ id: 'assignment-1' });
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'child-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsChildController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsChildFindUnique).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        select: { kidsSchoolId: true },
      });
      expect(kidsUserAssignmentFindFirst).toHaveBeenCalledWith({
        where: {
          kidsSchoolId: 'school-1',
          leadershipUnitId: kidsLeaderUser.sub,
          endDate: null,
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('rejects a KIDS_ASSISTANT with no assignment to the child\'s school (cross-school access)', async () => {
      kidsChildFindUnique.mockResolvedValue({ kidsSchoolId: 'school-2' });
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsAssistantUser,
        params: { id: 'child-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsChildController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('fails closed (rejects) when the child does not exist', async () => {
      kidsChildFindUnique.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'missing-child' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsChildController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
      expect(kidsUserAssignmentFindFirst).not.toHaveBeenCalled();
    });

    it('allows an Administrador without a scope query', async () => {
      const request: Partial<RequestWithUser> = { user: adminUser, params: { id: 'child-1' } };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsChildController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsChildFindUnique).not.toHaveBeenCalled();
    });
  });

  describe('KIDS_GUARDIAN — resolved through ANY of its linked children\'s schools', () => {
    it('allows when the actor has scope over at least one linked child\'s school', async () => {
      kidsChildGuardianFindMany.mockResolvedValue([
        { kidsChild: { kidsSchoolId: 'school-2' } },
        { kidsChild: { kidsSchoolId: 'school-1' } },
      ]);
      kidsUserAssignmentFindFirst
        .mockResolvedValueOnce(null) // school-2: no assignment
        .mockResolvedValueOnce({ id: 'assignment-1' }); // school-1: active assignment
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'guardian-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsGuardianController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsChildGuardianFindMany).toHaveBeenCalledWith({
        where: { kidsGuardianId: 'guardian-1', deletedAt: null },
        select: { kidsChild: { select: { kidsSchoolId: true } } },
      });
    });

    it('rejects when the actor has scope over none of the linked children\'s schools', async () => {
      kidsChildGuardianFindMany.mockResolvedValue([{ kidsChild: { kidsSchoolId: 'school-2' } }]);
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsAssistantUser,
        params: { id: 'guardian-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsGuardianController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('fails closed (rejects) when the guardian has no linked children at all', async () => {
      kidsChildGuardianFindMany.mockResolvedValue([]);
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { id: 'orphan-guardian' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsGuardianController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
      expect(kidsUserAssignmentFindFirst).not.toHaveBeenCalled();
    });

    it('allows an Administrador without a scope query', async () => {
      const request: Partial<RequestWithUser> = { user: adminUser, params: { id: 'guardian-1' } };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsGuardianController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsChildGuardianFindMany).not.toHaveBeenCalled();
    });
  });

  describe('KIDS_MEETING — resolved indirectly through the meeting\'s KidsSchool', () => {
    it('allows when the actor has an active assignment at the meeting\'s school', async () => {
      kidsMeetingFindUnique.mockResolvedValue({ kidsSchoolId: 'school-1' });
      kidsUserAssignmentFindFirst.mockResolvedValue({ id: 'assignment-1' });
      const request: Partial<RequestWithUser> = {
        user: kidsAssistantUser,
        params: { meetingId: 'meeting-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsMeetingController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsMeetingFindUnique).toHaveBeenCalledWith({
        where: { id: 'meeting-1' },
        select: { kidsSchoolId: true },
      });
      expect(kidsUserAssignmentFindFirst).toHaveBeenCalledWith({
        where: { kidsSchoolId: 'school-1', leadershipUnitId: kidsAssistantUser.sub, endDate: null, deletedAt: null },
        select: { id: true },
      });
    });

    it('rejects when the actor has no assignment at the meeting\'s school', async () => {
      kidsMeetingFindUnique.mockResolvedValue({ kidsSchoolId: 'school-2' });
      kidsUserAssignmentFindFirst.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { meetingId: 'meeting-1' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsMeetingController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('fails closed (rejects) when the meeting does not exist', async () => {
      kidsMeetingFindUnique.mockResolvedValue(null);
      const request: Partial<RequestWithUser> = {
        user: kidsLeaderUser,
        params: { meetingId: 'meeting-x' },
      };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsMeetingController.prototype.handler)),
      ).rejects.toThrow(ForbiddenException);
      expect(kidsUserAssignmentFindFirst).not.toHaveBeenCalled();
    });

    it('allows an Administrador without a scope query', async () => {
      const request: Partial<RequestWithUser> = { user: adminUser, params: { meetingId: 'meeting-1' } };
      await expect(
        guard.canActivate(createContext(request, UpdateKidsMeetingController.prototype.handler)),
      ).resolves.toBe(true);
      expect(kidsMeetingFindUnique).not.toHaveBeenCalled();
    });
  });
});
