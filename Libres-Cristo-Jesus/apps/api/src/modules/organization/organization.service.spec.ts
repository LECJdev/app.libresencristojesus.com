import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

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
    logo: null,
    primaryColor: '#1A2B3C',
    secondaryColor: '#D4AF37',
    address: null,
    phone: null,
    email: null,
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

const baseCreateDto: CreateOrganizationDto = {
  name: 'Libres en Cristo Jesús',
  primaryColor: '#1A2B3C',
  secondaryColor: '#D4AF37',
};

interface ChurchCreateArgs {
  data: Record<string, unknown>;
}

interface ChurchUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

describe('CreateOrganizationDto validation', () => {
  it('accepts a well-formed 6-digit hex color', async () => {
    const dto = plainToInstance(CreateOrganizationDto, baseCreateDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed primaryColor', async () => {
    const dto = plainToInstance(CreateOrganizationDto, { ...baseCreateDto, primaryColor: 'blue' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'primaryColor')).toBe(true);
  });

  it('rejects a malformed secondaryColor', async () => {
    const dto = plainToInstance(CreateOrganizationDto, {
      ...baseCreateDto,
      secondaryColor: '#12345',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'secondaryColor')).toBe(true);
  });

  it('rejects a malformed email', async () => {
    const dto = plainToInstance(CreateOrganizationDto, { ...baseCreateDto, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});

describe('OrganizationService', () => {
  let prisma: {
    church: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock<Promise<unknown>, [ChurchCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [ChurchUpdateArgs]>;
    };
    district: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrganizationService;

  beforeEach(() => {
    prisma = {
      church: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn<Promise<unknown>, [ChurchCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [ChurchUpdateArgs]>(),
      },
      district: { count: jest.fn() },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new OrganizationService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates an organization', async () => {
      prisma.church.create.mockResolvedValue(buildChurch());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).toMatchObject({ id: 'church-1', name: 'Libres en Cristo Jesús' });
      const [createArgs] = prisma.church.create.mock.calls[0]!;
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
    });
  });

  describe('findAll', () => {
    it('returns a paginated list', async () => {
      prisma.church.count.mockResolvedValue(1);
      prisma.church.findMany.mockResolvedValue([buildChurch()]);

      const result = await service.findAll({ page: 1, pageSize: 20, order: 'asc' });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, pages: 1 });
    });
  });

  describe('findOne', () => {
    it('returns an organization', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());

      const result = await service.findOne('church-1');

      expect(result.id).toBe('church-1');
    });

    it('throws 404 when the organization does not exist (or is soft-deleted)', async () => {
      prisma.church.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and increments version', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.church.update.mockResolvedValue(buildChurch({ name: 'Nueva Iglesia', version: 2 }));

      const dto: UpdateOrganizationDto = { name: 'Nueva Iglesia', version: 1 };
      const result = await service.update('church-1', dto, adminActor);

      const [updateArgs] = prisma.church.update.mock.calls[0]!;
      expect(updateArgs.where).toEqual({ id: 'church-1' });
      expect(updateArgs.data.name).toBe('Nueva Iglesia');
      expect(updateArgs.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
      expect(result.name).toBe('Nueva Iglesia');
    });

    it('rejects with 409 on a version mismatch (optimistic locking)', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch({ version: 3 }));

      const dto: UpdateOrganizationDto = { name: 'Nueva Iglesia', version: 1 };

      await expect(service.update('church-1', dto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.church.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the organization does not exist', async () => {
      prisma.church.findFirst.mockResolvedValue(null);

      await expect(service.update('missing-id', { version: 1 }, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes when there are no active districts', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.district.count.mockResolvedValue(0);
      prisma.church.update.mockResolvedValue(undefined);

      await service.remove('church-1', adminActor);

      const [updateArgs] = prisma.church.update.mock.calls[0]!;
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs.data.status).toBe(RecordStatus.INACTIVE);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
    });

    it('rejects with 409 when the organization still has active districts', async () => {
      prisma.church.findFirst.mockResolvedValue(buildChurch());
      prisma.district.count.mockResolvedValue(3);

      await expect(service.remove('church-1', adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.church.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the organization does not exist (or is already deleted)', async () => {
      prisma.church.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.district.count).not.toHaveBeenCalled();
    });
  });
});
