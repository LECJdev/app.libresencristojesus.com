import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { PeaceHousesService } from './peace-houses.service';
import type { CreatePeaceHouseDto } from './dto/create-peace-house.dto';
import type { UpdatePeaceHouseDto } from './dto/update-peace-house.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const adminActor: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};

function buildDistrict(overrides: Record<string, unknown> = {}) {
  return {
    id: 'district-1',
    churchId: 'church-1',
    number: 9,
    name: 'Distrito 09',
    status: RecordStatus.ACTIVE,
    deletedAt: null,
    ...overrides,
  };
}

function buildLeaderUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-leader-1',
    deletedAt: null,
    role: { id: 'role-leader', name: 'Líder' },
    ...overrides,
  };
}

function buildPeaceHouse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'peace-house-1',
    districtId: 'district-1',
    leadershipUnitId: 'unit-leader-1',
    name: 'Casa de Paz Esperanza',
    code: null,
    departmentId: null,
    municipalityId: null,
    neighborhood: null,
    address: null,
    // Prisma returns `Decimal | null` for these; `null` is what an
    // unset coordinate actually looks like coming out of the database.
    latitude: null,
    longitude: null,
    meetingDay: null,
    meetingHour: null,
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

const baseCreateDto: CreatePeaceHouseDto = {
  districtId: 'district-1',
  leadershipUnitId: 'unit-leader-1',
  name: 'Casa de Paz Esperanza',
};

interface PeaceHouseCreateArgs {
  data: Record<string, unknown>;
}

interface PeaceHouseUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

/** Leadership-history writes (doc06 §10) — typed so assertions on their
 * arguments stay type-safe instead of reaching into `any`. */
interface LeadershipHistoryCreateArgs {
  data: Record<string, unknown>;
}

interface LeadershipHistoryUpdateManyArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

interface PeaceHouseWhereArgs {
  where: Record<string, unknown>;
}

describe('PeaceHousesService', () => {
  let prisma: {
    district: { findFirst: jest.Mock };
    leadershipUnit: { findFirst: jest.Mock };
    peaceHouse: {
      findFirst: jest.Mock<Promise<unknown>, [PeaceHouseWhereArgs]>;
      findMany: jest.Mock;
      count: jest.Mock<Promise<unknown>, [PeaceHouseWhereArgs]>;
      create: jest.Mock<Promise<unknown>, [PeaceHouseCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [PeaceHouseUpdateArgs]>;
    };
    peaceHouseLeadershipHistory: {
      create: jest.Mock<Promise<unknown>, [LeadershipHistoryCreateArgs]>;
      updateMany: jest.Mock<Promise<unknown>, [LeadershipHistoryUpdateManyArgs]>;
    };
    catDepartment: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    catMunicipality: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    $transaction: jest.Mock;
  };
  let service: PeaceHousesService;

  beforeEach(() => {
    prisma = {
      district: { findFirst: jest.fn() },
      leadershipUnit: { findFirst: jest.fn() },
      peaceHouse: {
        findFirst: jest.fn<Promise<unknown>, [PeaceHouseWhereArgs]>(),
        findMany: jest.fn(),
        count: jest.fn<Promise<unknown>, [PeaceHouseWhereArgs]>(),
        create: jest.fn<Promise<unknown>, [PeaceHouseCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [PeaceHouseUpdateArgs]>(),
      },
      // Leadership history is written inside the same transaction as the
      // Casa de Paz itself (doc06 §10) — the `$transaction` mock below hands
      // this same object back as `tx`, so these stubs cover both paths.
      peaceHouseLeadershipHistory: {
        create: jest.fn<Promise<unknown>, [LeadershipHistoryCreateArgs]>().mockResolvedValue({}),
        updateMany: jest
          .fn<Promise<unknown>, [LeadershipHistoryUpdateManyArgs]>()
          .mockResolvedValue({ count: 0 }),
      },
      catDepartment: {
        findFirst: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue(null),
      },
      catMunicipality: {
        findFirst: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue(null),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new PeaceHousesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a peace house', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      prisma.peaceHouse.findFirst.mockResolvedValue(null);
      prisma.peaceHouse.create.mockResolvedValue(buildPeaceHouse());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).toMatchObject({
        id: 'peace-house-1',
        districtId: 'district-1',
        name: 'Casa de Paz Esperanza',
      });
      const [createArgs] = prisma.peaceHouse.create.mock.calls[0]!;
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
      expect(createArgs.data.leadershipUnitId).toBe('unit-leader-1');
    });

    it('rejects with 404 when districtId does not exist', async () => {
      prisma.district.findFirst.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when districtId matches an inactive District', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict({ status: RecordStatus.INACTIVE }));

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(BadRequestException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects with 404 when leadershipUnitId does not exist', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when leadershipUnitId does not have the "Líder" role', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(
        buildLeaderUnit({ role: { id: 'role-district-pastor', name: 'Pastor Distrito' } }),
      );

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(BadRequestException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the leadershipUnitId already leads another active Casa de Paz', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      prisma.peaceHouse.findFirst.mockResolvedValueOnce(
        buildPeaceHouse({ id: 'other-peace-house' }),
      );

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects with 409 when (districtId, name) is already taken', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      prisma.peaceHouse.findFirst
        .mockResolvedValueOnce(null) // leader-not-already-leading check
        .mockResolvedValueOnce(buildPeaceHouse()); // name-uniqueness check

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns a paginated list filtered by districtId', async () => {
      prisma.peaceHouse.count.mockResolvedValue(1);
      prisma.peaceHouse.findMany.mockResolvedValue([buildPeaceHouse()]);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        order: 'asc',
        districtId: 'district-1',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, pages: 1 });
      const [whereArgs] = prisma.peaceHouse.count.mock.calls[0]!;
      expect(whereArgs.where.districtId).toBe('district-1');
    });
  });

  describe('findOne', () => {
    it('returns a peace house', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(buildPeaceHouse());

      const result = await service.findOne('peace-house-1');

      expect(result.id).toBe('peace-house-1');
    });

    it('throws 404 when the peace house does not exist (or is soft-deleted)', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and increments version', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValueOnce(buildPeaceHouse());
      prisma.peaceHouse.update.mockResolvedValue(
        buildPeaceHouse({ name: 'Casa Renovada', version: 2 }),
      );

      const dto: UpdatePeaceHouseDto = { name: 'Casa Renovada', version: 1 };
      const result = await service.update('peace-house-1', dto, adminActor);

      const [updateArgs] = prisma.peaceHouse.update.mock.calls[0]!;
      expect(updateArgs.where).toEqual({ id: 'peace-house-1' });
      expect(updateArgs.data.name).toBe('Casa Renovada');
      expect(updateArgs.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
      expect(result.name).toBe('Casa Renovada');
    });

    it('rejects with 409 on a version mismatch (optimistic locking)', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(buildPeaceHouse({ version: 3 }));

      const dto: UpdatePeaceHouseDto = { name: 'Casa Renovada', version: 1 };

      await expect(service.update('peace-house-1', dto, adminActor)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.peaceHouse.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the peace house does not exist', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(null);

      await expect(service.update('missing-id', { version: 1 }, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-validates uniqueness when the name changes, excluding itself', async () => {
      prisma.peaceHouse.findFirst
        .mockResolvedValueOnce(buildPeaceHouse())
        .mockResolvedValueOnce(null);
      prisma.peaceHouse.update.mockResolvedValue(
        buildPeaceHouse({ name: 'Casa Nueva', version: 2 }),
      );

      const dto: UpdatePeaceHouseDto = { name: 'Casa Nueva', version: 1 };
      await service.update('peace-house-1', dto, adminActor);

      const [findArgs] = prisma.peaceHouse.findFirst.mock.calls[1]!;
      expect(findArgs.where.NOT).toEqual({ id: 'peace-house-1' });
    });
  });

  describe('remove', () => {
    it('soft-deletes the peace house', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(buildPeaceHouse());
      prisma.peaceHouse.update.mockResolvedValue(undefined);

      await service.remove('peace-house-1', adminActor);

      const [updateArgs] = prisma.peaceHouse.update.mock.calls[0]!;
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs.data.status).toBe(RecordStatus.INACTIVE);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
    });

    it('throws 404 when the peace house does not exist (or is already deleted)', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.peaceHouse.update).not.toHaveBeenCalled();
    });
  });

  /**
   * The geographic pair is the one rule the database cannot enforce on its
   * own: each foreign key proves its id exists, but nothing proves the
   * municipality belongs to the department. These cover that gap.
   */
  describe('location coherence', () => {
    function arrangeValidCreate(): void {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      prisma.peaceHouse.findFirst.mockResolvedValue(null);
      prisma.peaceHouse.create.mockResolvedValue(buildPeaceHouse());
    }

    it('accepts a municipality that belongs to the given department', async () => {
      arrangeValidCreate();
      prisma.catDepartment.findFirst.mockResolvedValue({ id: 'dept-1' });
      prisma.catMunicipality.findFirst.mockResolvedValue({ id: 'mun-1', departmentId: 'dept-1' });

      await service.create(
        { ...baseCreateDto, departmentId: 'dept-1', municipalityId: 'mun-1' },
        adminActor,
      );

      expect(prisma.peaceHouse.create).toHaveBeenCalled();
    });

    it('rejects a municipality that belongs to a different department', async () => {
      arrangeValidCreate();
      prisma.catDepartment.findFirst.mockResolvedValue({ id: 'dept-1' });
      // The row exists and the FK would accept it — only this check catches
      // that it sits in another department.
      prisma.catMunicipality.findFirst.mockResolvedValue({
        id: 'mun-9',
        departmentId: 'dept-OTHER',
      });

      await expect(
        service.create(
          { ...baseCreateDto, departmentId: 'dept-1', municipalityId: 'mun-9' },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects a municipality sent without its department', async () => {
      arrangeValidCreate();

      await expect(
        service.create({ ...baseCreateDto, municipalityId: 'mun-1' }, adminActor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });

    it('rejects a departmentId that matches no CatDepartment', async () => {
      arrangeValidCreate();
      prisma.catDepartment.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ ...baseCreateDto, departmentId: 'ghost' }, adminActor),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });
  });

  describe('leadership history', () => {
    it('opens a history period when the Casa de Paz is created', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      prisma.peaceHouse.findFirst.mockResolvedValue(null);
      prisma.peaceHouse.create.mockResolvedValue(buildPeaceHouse());

      await service.create(baseCreateDto, adminActor);

      const [historyArgs] = prisma.peaceHouseLeadershipHistory.create.mock.calls[0]!;
      expect(historyArgs.data).toMatchObject({
        peaceHouseId: 'peace-house-1',
        leadershipUnitId: 'unit-leader-1',
        createdBy: adminActor.sub,
      });
      expect(historyArgs.data.startDate).toBeInstanceOf(Date);
      // The opening period must stay open — an endDate here would record a
      // leadership that ended the instant it began.
      expect(historyArgs.data.endDate).toBeUndefined();
    });

    it('closes the open period before opening the next one when leadership changes', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValueOnce(buildPeaceHouse()).mockResolvedValue(null);
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit({ id: 'unit-leader-2' }));
      prisma.peaceHouse.update.mockResolvedValue(
        buildPeaceHouse({ leadershipUnitId: 'unit-leader-2' }),
      );

      await service.update(
        'peace-house-1',
        { leadershipUnitId: 'unit-leader-2', version: 1 },
        adminActor,
      );

      const [closeArgs] = prisma.peaceHouseLeadershipHistory.updateMany.mock.calls[0]!;
      expect(closeArgs.where).toMatchObject({ peaceHouseId: 'peace-house-1', endDate: null });
      expect(closeArgs.data.endDate).toBeInstanceOf(Date);

      const [openArgs] = prisma.peaceHouseLeadershipHistory.create.mock.calls[0]!;
      expect(openArgs.data).toMatchObject({
        peaceHouseId: 'peace-house-1',
        leadershipUnitId: 'unit-leader-2',
        createdBy: adminActor.sub,
      });
    });

    it('does not touch history when leadership is unchanged', async () => {
      // First call loads the row being edited; the second is the
      // (districtId, name) uniqueness check, which must find nothing.
      prisma.peaceHouse.findFirst.mockResolvedValueOnce(buildPeaceHouse()).mockResolvedValue(null);
      prisma.peaceHouse.update.mockResolvedValue(buildPeaceHouse({ name: 'Casa Nueva' }));

      await service.update('peace-house-1', { name: 'Casa Nueva', version: 1 }, adminActor);

      expect(prisma.peaceHouseLeadershipHistory.updateMany).not.toHaveBeenCalled();
      expect(prisma.peaceHouseLeadershipHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('code uniqueness', () => {
    it('rejects a code already used by another Casa de Paz', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildLeaderUnit());
      // First lookup is the (districtId, name) check, second is the code.
      prisma.peaceHouse.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'other-house' });

      await expect(
        service.create({ ...baseCreateDto, code: 'CP-09-004' }, adminActor),
      ).rejects.toThrow(ConflictException);
      expect(prisma.peaceHouse.create).not.toHaveBeenCalled();
    });
  });
});
