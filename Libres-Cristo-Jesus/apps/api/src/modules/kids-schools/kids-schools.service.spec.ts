import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { KidsAssignmentRole, Prisma, RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { KidsSchoolsService } from './kids-schools.service';
import type { CreateKidsAssignmentDto } from './dto/create-kids-assignment.dto';
import type { CreateKidsSchoolDto } from './dto/create-kids-school.dto';
import type { UpdateKidsSchoolDto } from './dto/update-kids-school.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const adminActor: JwtPayload = { sub: 'unit-admin', memberId: 'member-admin', username: 'admin', role: RoleName.ADMIN };
const leaderActor: JwtPayload = {
  sub: 'unit-kids-leader-norte',
  memberId: 'member-kids-leader-norte',
  username: 'kidsleadernorte',
  role: RoleName.KIDS_LEADER,
};
const assistantActor: JwtPayload = {
  sub: 'unit-kids-assistant-norte',
  memberId: 'member-kids-assistant-norte',
  username: 'kidsassistantnorte',
  role: RoleName.KIDS_ASSISTANT,
};

function buildSchool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'school-norte',
    name: 'Escuela Kids Norte',
    status: RecordStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...overrides,
  };
}

function buildAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-1',
    kidsSchoolId: 'school-norte',
    leadershipUnitId: 'unit-kids-leader-norte',
    role: KidsAssignmentRole.LEADER,
    canCreateChild: true,
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: null,
    reason: 'Asignación de líder',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'unit-admin',
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...overrides,
  };
}

function buildLeadershipUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-kids-leader-norte',
    deletedAt: null,
    role: { id: 'role-kids-leader', name: 'Líder Escuela Kids' },
    ...overrides,
  };
}

const baseCreateSchoolDto: CreateKidsSchoolDto = { name: 'Escuela Kids Norte' };

/** Typed so `.mock.calls[0][0]` assertions stay type-safe instead of reaching into `any`. */
interface WhereArgs {
  where: Record<string, unknown>;
}
interface CreateArgs {
  data: Record<string, unknown>;
}
interface UpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}
interface UpdateManyArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

describe('KidsSchoolsService', () => {
  let prisma: {
    kidsSchool: {
      findFirst: jest.Mock<Promise<unknown>, [WhereArgs]>;
      findMany: jest.Mock<Promise<unknown>, [WhereArgs]>;
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      update: jest.Mock<Promise<unknown>, [UpdateArgs]>;
    };
    kidsUserAssignment: {
      findFirst: jest.Mock<Promise<unknown>, [WhereArgs]>;
      findMany: jest.Mock<Promise<unknown>, [WhereArgs]>;
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      update: jest.Mock<Promise<unknown>, [UpdateArgs]>;
      updateMany: jest.Mock<Promise<unknown>, [UpdateManyArgs]>;
    };
    leadershipUnit: { findFirst: jest.Mock<Promise<unknown>, [WhereArgs]> };
    $transaction: jest.Mock;
  };
  let service: KidsSchoolsService;

  beforeEach(() => {
    prisma = {
      kidsSchool: {
        findFirst: jest.fn<Promise<unknown>, [WhereArgs]>(),
        findMany: jest.fn<Promise<unknown>, [WhereArgs]>(),
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        update: jest.fn<Promise<unknown>, [UpdateArgs]>(),
      },
      kidsUserAssignment: {
        findFirst: jest.fn<Promise<unknown>, [WhereArgs]>(),
        findMany: jest.fn<Promise<unknown>, [WhereArgs]>(),
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        update: jest.fn<Promise<unknown>, [UpdateArgs]>(),
        updateMany: jest.fn<Promise<unknown>, [UpdateManyArgs]>().mockResolvedValue({ count: 0 }),
      },
      leadershipUnit: { findFirst: jest.fn<Promise<unknown>, [WhereArgs]>() },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new KidsSchoolsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a school when the name is unique', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(null);
      prisma.kidsSchool.create.mockResolvedValue(buildSchool());

      const result = await service.create(baseCreateSchoolDto, adminActor);

      expect(result.id).toBe('school-norte');
      expect(prisma.kidsSchool.create).toHaveBeenCalledWith({
        data: { name: 'Escuela Kids Norte', createdBy: 'unit-admin' },
      });
    });

    it('rejects a duplicate name with 409', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());

      await expect(service.create(baseCreateSchoolDto, adminActor)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.kidsSchool.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('does not scope-filter for ADMIN', async () => {
      prisma.kidsSchool.findMany.mockResolvedValue([buildSchool()]);

      await service.findAll(adminActor);

      const call = prisma.kidsSchool.findMany.mock.calls[0]![0];
      expect(call.where.assignments).toBeUndefined();
    });

    it('filters to schools with an active assignment for KIDS_LEADER/KIDS_ASSISTANT', async () => {
      prisma.kidsSchool.findMany.mockResolvedValue([buildSchool()]);

      await service.findAll(leaderActor);

      const call = prisma.kidsSchool.findMany.mock.calls[0]![0];
      expect(call.where.assignments).toEqual({
        some: { leadershipUnitId: 'unit-kids-leader-norte', endDate: null, deletedAt: null },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the school does not exist', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a stale version with 409', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool({ version: 2 }));

      const dto: UpdateKidsSchoolDto = { name: 'Escuela Kids Norte 2', version: 1 };

      await expect(service.update('school-norte', dto, adminActor)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.kidsSchool.update).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name on rename', async () => {
      prisma.kidsSchool.findFirst
        .mockResolvedValueOnce(buildSchool()) // findActiveSchoolOrThrow
        .mockResolvedValueOnce(buildSchool({ id: 'school-sur', name: 'Escuela Kids Sur' })); // assertNameIsUnique

      const dto: UpdateKidsSchoolDto = { name: 'Escuela Kids Sur', version: 1 };

      await expect(service.update('school-norte', dto, adminActor)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createAssignment — role LEADER', () => {
    const dto: CreateKidsAssignmentDto = {
      leadershipUnitId: 'unit-kids-leader-norte',
      role: KidsAssignmentRole.LEADER,
    };

    it('rejects when the actor is not ADMIN', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());

      await expect(service.createAssignment('school-norte', dto, leaderActor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.kidsUserAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects when leadershipUnitId does not hold the KIDS_LEADER role', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.leadershipUnit.findFirst.mockResolvedValue(
        buildLeadershipUnit({ role: { id: 'role-kids-assistant', name: 'Auxiliar Escuela Kids' } }),
      );

      await expect(service.createAssignment('school-norte', dto, adminActor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('closes the previous active LEADER before creating the new one, in the same transaction', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeadershipUnit());
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(null); // not active elsewhere
      prisma.kidsUserAssignment.create.mockResolvedValue(buildAssignment());

      await service.createAssignment('school-norte', dto, adminActor);

      expect(prisma.kidsUserAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          kidsSchoolId: 'school-norte',
          endDate: null,
          deletedAt: null,
          OR: [{ role: KidsAssignmentRole.LEADER }, { leadershipUnitId: 'unit-kids-leader-norte' }],
        },
        data: { endDate: expect.any(Date) as Date, updatedBy: 'unit-admin' },
      });
      expect(prisma.kidsUserAssignment.create).toHaveBeenCalledWith({
        data: {
          kidsSchoolId: 'school-norte',
          leadershipUnitId: 'unit-kids-leader-norte',
          role: KidsAssignmentRole.LEADER,
          reason: 'Asignación de líder',
          createdBy: 'unit-admin',
        },
      });
    });

    it('rejects a concurrent double-leader race with 409 instead of a raw 500', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeadershipUnit());
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(null);
      prisma.kidsUserAssignment.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }),
      );

      await expect(service.createAssignment('school-norte', dto, adminActor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('createAssignment — role ASSISTANT', () => {
    const dto: CreateKidsAssignmentDto = {
      leadershipUnitId: 'unit-kids-assistant-norte',
      role: KidsAssignmentRole.ASSISTANT,
    };

    it('rejects when the actor is KIDS_ASSISTANT (defense in depth)', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());

      await expect(service.createAssignment('school-norte', dto, assistantActor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows the KIDS_LEADER of that school to create an assistant assignment', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.leadershipUnit.findFirst.mockResolvedValue(
        buildLeadershipUnit({ id: 'unit-kids-assistant-norte', role: { id: 'role-kids-assistant', name: 'Auxiliar Escuela Kids' } }),
      );
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(null);
      prisma.kidsUserAssignment.create.mockResolvedValue(
        buildAssignment({ role: KidsAssignmentRole.ASSISTANT, leadershipUnitId: 'unit-kids-assistant-norte' }),
      );

      const result = await service.createAssignment('school-norte', dto, leaderActor);

      expect(result.role).toBe(KidsAssignmentRole.ASSISTANT);
      // ASSISTANT never closes anything — only LEADER creation does.
      expect(prisma.kidsUserAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('rejects when leadershipUnitId already has an active assignment at a different school', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.leadershipUnit.findFirst.mockResolvedValue(
        buildLeadershipUnit({ id: 'unit-kids-assistant-norte', role: { id: 'role-kids-assistant', name: 'Auxiliar Escuela Kids' } }),
      );
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(
        buildAssignment({ kidsSchoolId: 'school-sur', role: KidsAssignmentRole.ASSISTANT }),
      );

      await expect(service.createAssignment('school-norte', dto, leaderActor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('removeAssignment', () => {
    it('rejects removing a LEADER assignment directly', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(buildAssignment({ role: KidsAssignmentRole.LEADER }));

      await expect(service.removeAssignment('school-norte', 'assignment-1', adminActor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.kidsUserAssignment.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the assignment does not exist or is already closed', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(null);

      await expect(service.removeAssignment('school-norte', 'missing', adminActor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('closes an ASSISTANT assignment by setting endDate, never deletedAt', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());
      prisma.kidsUserAssignment.findFirst.mockResolvedValue(buildAssignment({ role: KidsAssignmentRole.ASSISTANT }));

      await service.removeAssignment('school-norte', 'assignment-1', leaderActor);

      expect(prisma.kidsUserAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: {
          endDate: expect.any(Date) as Date,
          reason: 'Auxiliar retirado',
          updatedBy: 'unit-kids-leader-norte',
        },
      });
      const call = prisma.kidsUserAssignment.update.mock.calls[0]![0];
      expect(call.data.deletedAt).toBeUndefined();
    });
  });
});
