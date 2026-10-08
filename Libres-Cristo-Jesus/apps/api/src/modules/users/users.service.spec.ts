import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LeadershipUnitStatus } from '@prisma/client';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { UsersService } from './users.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const adminActor: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};
const districtPastorActor: JwtPayload = {
  sub: 'unit-district-pastor',
  memberId: 'member-district-pastor',
  username: 'district-pastor',
  role: RoleName.DISTRICT_PASTOR,
};
const generalPastorActor: JwtPayload = {
  sub: 'unit-general-pastor',
  memberId: 'member-general-pastor',
  username: 'general-pastor',
  role: RoleName.GENERAL_PASTOR,
};
const kidsLeaderActor: JwtPayload = {
  sub: 'unit-kids-leader',
  memberId: 'member-kids-leader',
  username: 'kids-leader',
  role: RoleName.KIDS_LEADER,
};

function buildRole(roleName: RoleName, overrides: Record<string, unknown> = {}) {
  return { id: `role-${roleName}`, name: ROLE_NAME_LABELS[roleName], ...overrides };
}

function buildUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-1',
    type: 'Líder',
    photo: null,
    roleId: 'role-LEADER',
    role: buildRole(RoleName.LEADER),
    status: LeadershipUnitStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
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
        username: 'lider.carlos',
        passwordHash: 'hash',
        mustChangePassword: false,
      },
    ],
    ...overrides,
  };
}

const baseCreateDto: CreateUserDto = {
  type: 'Líder',
  roleId: 'role-LEADER',
  members: [
    {
      firstName: 'Carlos',
      lastName: 'Pérez',
      gender: 'M',
      username: 'lider.carlos',
      password: 'Correct-Password1!',
    },
  ],
};

interface LeadershipUnitCreateArgs {
  data: Record<string, unknown>;
  include?: unknown;
}

interface LeadershipUnitUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

interface LeadershipUnitFindManyArgs {
  where: Record<string, unknown>;
  include?: unknown;
  orderBy?: unknown;
  skip?: number;
  take?: number;
}

describe('UsersService', () => {
  let prisma: {
    leadershipUnit: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock<Promise<unknown[]>, [LeadershipUnitFindManyArgs]>;
      count: jest.Mock;
      create: jest.Mock<Promise<unknown>, [LeadershipUnitCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [LeadershipUnitUpdateArgs]>;
    };
    leadershipMember: { update: jest.Mock; create: jest.Mock; findFirst: jest.Mock };
    catRole: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      leadershipUnit: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn<Promise<unknown[]>, [LeadershipUnitFindManyArgs]>(),
        count: jest.fn(),
        create: jest.fn<Promise<unknown>, [LeadershipUnitCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [LeadershipUnitUpdateArgs]>(),
      },
      leadershipMember: { update: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
      catRole: { findUnique: jest.fn() },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };
    // Default: every username is available unless a test says otherwise —
    // `create`/`update` both check this before touching anything else.
    prisma.leadershipMember.findFirst.mockResolvedValue(null);

    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a user with a hashed password and returns it without passwordHash', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.LEADER));
      prisma.leadershipUnit.create.mockResolvedValue(buildUnit());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({ id: 'unit-1', role: RoleName.LEADER });
      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toMatchObject({ username: 'lider.carlos' });
      expect(result.members[0]).not.toHaveProperty('passwordHash');

      const [createArgs] = prisma.leadershipUnit.create.mock.calls[0]!;
      const membersCreate = (createArgs.data.members as { create: Record<string, unknown>[] })
        .create;
      expect(membersCreate[0]?.username).toBe('lider.carlos');
      expect(membersCreate[0]?.passwordHash).not.toBe(baseCreateDto.members[0]!.password);
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
    });

    it('rejects a duplicate username with 409', async () => {
      prisma.leadershipMember.findFirst.mockResolvedValue(buildUnit().members[0]);

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('rejects when roleId does not match any CatRole', async () => {
      prisma.catRole.findUnique.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(BadRequestException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('rejects a Pastor Distrito trying to create a role other than Líder', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.DISTRICT_PASTOR));

      await expect(
        service.create({ ...baseCreateDto, roleId: 'role-DISTRICT_PASTOR' }, districtPastorActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('allows a Pastor Distrito to create a Líder user', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.LEADER));
      prisma.leadershipUnit.create.mockResolvedValue(buildUnit());

      await expect(service.create(baseCreateDto, districtPastorActor)).resolves.toMatchObject({
        role: RoleName.LEADER,
      });
    });

    it('rejects a Pastor General trying to create an Administrador', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.ADMIN));

      await expect(
        service.create({ ...baseCreateDto, roleId: 'role-ADMIN' }, generalPastorActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('allows a KIDS_LEADER to create a KIDS_ASSISTANT user (Escuela Kids: designar auxiliares)', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.KIDS_ASSISTANT));
      prisma.leadershipUnit.create.mockResolvedValue(
        buildUnit({ roleId: 'role-KIDS_ASSISTANT', role: buildRole(RoleName.KIDS_ASSISTANT) }),
      );

      await expect(
        service.create({ ...baseCreateDto, roleId: 'role-KIDS_ASSISTANT' }, kidsLeaderActor),
      ).resolves.toMatchObject({ role: RoleName.KIDS_ASSISTANT });
    });

    it('rejects a KIDS_LEADER trying to create another KIDS_LEADER', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.KIDS_LEADER));

      await expect(
        service.create({ ...baseCreateDto, roleId: 'role-KIDS_LEADER' }, kidsLeaderActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('rejects a KIDS_LEADER trying to create a Líder (Casas de Paz) user', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.LEADER));

      await expect(
        service.create({ ...baseCreateDto, roleId: 'role-LEADER' }, kidsLeaderActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns a paginated list built from count + findMany', async () => {
      prisma.leadershipUnit.count.mockResolvedValue(1);
      prisma.leadershipUnit.findMany.mockResolvedValue([buildUnit()]);

      const result = await service.findAll({ page: 1, pageSize: 20, order: 'asc' });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, pages: 1 });
      const [findManyArgs] = prisma.leadershipUnit.findMany.mock.calls[0] ?? [];
      expect(findManyArgs?.where.deletedAt).toBeNull();
    });
  });

  describe('findOne', () => {
    it('throws 404 when the user does not exist (or is soft-deleted)', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the sanitized user when found', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildUnit());

      const result = await service.findOne('unit-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('unit-1');
    });
  });

  describe('update', () => {
    it('rejects a stale version with 409 (optimistic locking)', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildUnit({ version: 3 }));

      await expect(service.update('unit-1', { version: 1 }, adminActor)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.leadershipUnit.update).not.toHaveBeenCalled();
    });

    it('updates the unit, increments version, and returns the fresh record', async () => {
      prisma.leadershipUnit.findFirst
        .mockResolvedValueOnce(buildUnit({ version: 1 }))
        .mockResolvedValueOnce(buildUnit({ version: 2, type: 'Pastor Distrito' }));
      prisma.leadershipUnit.update.mockResolvedValue(undefined);

      const result = await service.update(
        'unit-1',
        { type: 'Pastor Distrito', version: 1 },
        adminActor,
      );

      const [updateArgs] = prisma.leadershipUnit.update.mock.calls[0] ?? [];
      expect(updateArgs?.where).toEqual({ id: 'unit-1' });
      expect(updateArgs?.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs?.data.version).toEqual({ increment: 1 });
      expect(result.type).toBe('Pastor Distrito');
    });

    it('rejects a username collision with 409', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildUnit({ version: 1 }));
      prisma.leadershipMember.findFirst.mockResolvedValue({ id: 'someone-elses-member' });

      await expect(
        service.update(
          'unit-1',
          {
            members: [
              {
                id: 'member-1',
                firstName: 'Carlos',
                lastName: 'Pérez',
                gender: 'M',
                username: 'taken',
              },
            ],
            version: 1,
          },
          adminActor,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.leadershipUnit.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes: sets deletedAt/deletedBy/status, never a hard delete', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildUnit());
      prisma.leadershipUnit.update.mockResolvedValue(undefined);

      await service.remove('unit-1', adminActor);

      const [updateArgs] = prisma.leadershipUnit.update.mock.calls[0] ?? [];
      expect(updateArgs?.where).toEqual({ id: 'unit-1' });
      expect(updateArgs?.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs?.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs?.data.status).toBe(LeadershipUnitStatus.RETIRED);
      expect(updateArgs?.data.version).toEqual({ increment: 1 });
    });

    it('throws 404 when the user does not exist (or is already deleted)', async () => {
      prisma.leadershipUnit.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.leadershipUnit.update).not.toHaveBeenCalled();
    });
  });

  /**
   * doc06 §2: "Pastores Generales" is a single node. Two people, ONE
   * account — they are the two members of one LeadershipUnit, never two
   * units. Nothing in the schema expresses this, so the rule is here and
   * must be covered on both paths that could break it.
   */
  describe('unicidad de Pastores Generales', () => {
    const generalPastorDto: CreateUserDto = {
      ...baseCreateDto,
      type: 'Pastor General',
      roleId: 'role-GENERAL_PASTOR',
      members: [{ ...baseCreateDto.members[0]!, username: 'pastores.generales' }],
    };

    it('allows the first Pastores Generales account', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.GENERAL_PASTOR));
      // No existing unit holds the role.
      prisma.leadershipUnit.findFirst.mockResolvedValue(null);
      prisma.leadershipUnit.create.mockResolvedValue(buildUnit());

      await service.create(generalPastorDto, adminActor);

      expect(prisma.leadershipUnit.create).toHaveBeenCalled();
    });

    it('rejects a second Pastores Generales account with 409', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.GENERAL_PASTOR));
      prisma.leadershipUnit.findFirst.mockResolvedValue({ id: 'unit-existing' });

      await expect(service.create(generalPastorDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.leadershipUnit.create).not.toHaveBeenCalled();
    });

    it('ignores the rule for any other role', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.LEADER));
      prisma.leadershipUnit.create.mockResolvedValue(buildUnit());

      await service.create(baseCreateDto, adminActor);

      // The uniqueness lookup must not even run for a Líder.
      expect(prisma.leadershipUnit.findFirst).not.toHaveBeenCalled();
    });

    it('rejects reassigning another unit INTO the Pastor General role', async () => {
      prisma.leadershipUnit.findFirst
        // 1st call: findActiveUnitOrThrow loads the unit being edited.
        .mockResolvedValueOnce(buildUnit())
        // 2nd call: the uniqueness check finds the incumbent.
        .mockResolvedValueOnce({ id: 'unit-existing', username: 'pastores.generales' });
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.GENERAL_PASTOR));

      await expect(
        service.update('unit-1', { roleId: 'role-GENERAL_PASTOR', version: 1 }, adminActor),
      ).rejects.toThrow(ConflictException);
    });
  });
});
