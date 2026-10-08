import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { DistrictsService } from './districts.service';
import type { CreateDistrictDto } from './dto/create-district.dto';
import type { UpdateDistrictDto } from './dto/update-district.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const adminActor: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};

function buildChurch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'church-1',
    name: 'Libres en Cristo Jesús',
    status: RecordStatus.ACTIVE,
    deletedAt: null,
    ...overrides,
  };
}

function buildDistrictPastorUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-1',
    deletedAt: null,
    role: { id: 'role-district-pastor', name: 'Pastor Distrito' },
    ...overrides,
  };
}

function buildDistrict(overrides: Record<string, unknown> = {}) {
  return {
    id: 'district-1',
    churchId: 'church-1',
    number: 9,
    name: 'Distrito 09',
    leadershipUnitId: null,
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

const baseCreateDto: CreateDistrictDto = {
  churchId: 'church-1',
  number: 9,
  name: 'Distrito 09',
};

interface DistrictCreateArgs {
  data: Record<string, unknown>;
}

interface DistrictUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

interface DistrictWhereArgs {
  where: Record<string, unknown>;
}

describe('DistrictsService', () => {
  let prisma: {
    church: { findFirst: jest.Mock };
    leadershipUnit: { findFirst: jest.Mock };
    district: {
      findFirst: jest.Mock<Promise<unknown>, [DistrictWhereArgs]>;
      findMany: jest.Mock;
      count: jest.Mock<Promise<unknown>, [DistrictWhereArgs]>;
      create: jest.Mock<Promise<unknown>, [DistrictCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [DistrictUpdateArgs]>;
    };
    peaceHouse: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: DistrictsService;

  beforeEach(() => {
    prisma = {
      church: { findFirst: jest.fn() },
      leadershipUnit: { findFirst: jest.fn() },
      district: {
        findFirst: jest.fn<Promise<unknown>, [DistrictWhereArgs]>(),
        findMany: jest.fn(),
        count: jest.fn<Promise<unknown>, [DistrictWhereArgs]>(),
        create: jest.fn<Promise<unknown>, [DistrictCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [DistrictUpdateArgs]>(),
      },
      peaceHouse: { count: jest.fn() },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new DistrictsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a district', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.district.findFirst.mockResolvedValue(null);
      prisma.district.create.mockResolvedValue(buildDistrict());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).toMatchObject({ id: 'district-1', churchId: 'church-1', number: 9 });
      const [createArgs] = prisma.district.create.mock.calls[0]!;
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
      expect(createArgs.data.leadershipUnitId).toBeNull();
    });

    it('rejects with 404 when churchId does not exist', async () => {
      prisma.church.findFirst.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when churchId matches an inactive Church', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch({ status: RecordStatus.INACTIVE }));

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(BadRequestException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when leadershipUnitId does not have the "Pastor Distrito" role', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.leadershipUnit.findFirst.mockResolvedValue(
        buildDistrictPastorUnit({ role: { id: 'role-leader', name: 'Líder' } }),
      );

      const dto: CreateDistrictDto = { ...baseCreateDto, leadershipUnitId: 'unit-1' };

      await expect(service.create(dto, adminActor)).rejects.toThrow(BadRequestException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });

    it('rejects with 404 when leadershipUnitId does not exist', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.leadershipUnit.findFirst.mockResolvedValue(null);

      const dto: CreateDistrictDto = { ...baseCreateDto, leadershipUnitId: 'missing-unit' };

      await expect(service.create(dto, adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });

    it('accepts a leadershipUnitId with the "Pastor Distrito" role', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.leadershipUnit.findFirst.mockResolvedValue(buildDistrictPastorUnit());
      prisma.district.findFirst.mockResolvedValue(null);
      prisma.district.create.mockResolvedValue(buildDistrict({ leadershipUnitId: 'unit-1' }));

      const dto: CreateDistrictDto = { ...baseCreateDto, leadershipUnitId: 'unit-1' };
      const result = await service.create(dto, adminActor);

      expect(result.leadershipUnitId).toBe('unit-1');
    });

    it('rejects with 409 when (churchId, number) is already taken', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.district.findFirst.mockResolvedValue(buildDistrict());

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns a paginated list filtered by churchId', async () => {
      prisma.district.count.mockResolvedValue(1);
      prisma.district.findMany.mockResolvedValue([buildDistrict()]);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        order: 'asc',
        churchId: 'church-1',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, pages: 1 });
      const [whereArgs] = prisma.district.count.mock.calls[0]!;
      expect(whereArgs.where.churchId).toBe('church-1');
    });
  });

  describe('findOne', () => {
    it('returns a district', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());

      const result = await service.findOne('district-1');

      expect(result.id).toBe('district-1');
    });

    it('throws 404 when the district does not exist (or is soft-deleted)', async () => {
      prisma.district.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and increments version', async () => {
      prisma.district.findFirst.mockResolvedValueOnce(buildDistrict());
      prisma.district.update.mockResolvedValue(
        buildDistrict({ name: 'Distrito 09 Renovado', version: 2 }),
      );

      const dto: UpdateDistrictDto = { name: 'Distrito 09 Renovado', version: 1 };
      const result = await service.update('district-1', dto, adminActor);

      const [updateArgs] = prisma.district.update.mock.calls[0]!;
      expect(updateArgs.where).toEqual({ id: 'district-1' });
      expect(updateArgs.data.name).toBe('Distrito 09 Renovado');
      expect(updateArgs.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
      expect(result.name).toBe('Distrito 09 Renovado');
    });

    it('rejects with 409 on a version mismatch (optimistic locking)', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict({ version: 3 }));

      const dto: UpdateDistrictDto = { name: 'Distrito 09 Renovado', version: 1 };

      await expect(service.update('district-1', dto, adminActor)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.district.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the district does not exist', async () => {
      prisma.district.findFirst.mockResolvedValue(null);

      await expect(service.update('missing-id', { version: 1 }, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-validates uniqueness when the number changes, excluding itself', async () => {
      prisma.district.findFirst.mockResolvedValueOnce(buildDistrict()).mockResolvedValueOnce(null);
      prisma.district.update.mockResolvedValue(buildDistrict({ number: 10, version: 2 }));

      const dto: UpdateDistrictDto = { number: 10, version: 1 };
      await service.update('district-1', dto, adminActor);

      const [findArgs] = prisma.district.findFirst.mock.calls[1]!;
      expect(findArgs.where.NOT).toEqual({ id: 'district-1' });
    });
  });

  describe('remove', () => {
    it('soft-deletes when there are no active Casas de Paz', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.peaceHouse.count.mockResolvedValue(0);
      prisma.district.update.mockResolvedValue(undefined);

      await service.remove('district-1', adminActor);

      const [updateArgs] = prisma.district.update.mock.calls[0]!;
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs.data.status).toBe(RecordStatus.INACTIVE);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
    });

    it('rejects with 409 when the district still has active Casas de Paz', async () => {
      prisma.district.findFirst.mockResolvedValue(buildDistrict());
      prisma.peaceHouse.count.mockResolvedValue(2);

      await expect(service.remove('district-1', adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.district.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the district does not exist (or is already deleted)', async () => {
      prisma.district.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.peaceHouse.count).not.toHaveBeenCalled();
    });
  });
});
