import { NotFoundException } from '@nestjs/common';
import { RoleName, ROLE_NAME_LABELS } from '@lcj/types';
import { RolesService } from './roles.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildRole(roleName: RoleName, overrides: Record<string, unknown> = {}) {
  return {
    id: `role-${roleName}`,
    name: ROLE_NAME_LABELS[roleName],
    description: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

interface CatRoleFindManyArgs {
  orderBy?: unknown;
}

describe('RolesService', () => {
  let prisma: {
    catRole: {
      findMany: jest.Mock<Promise<unknown[]>, [CatRoleFindManyArgs?]>;
      findUnique: jest.Mock;
    };
  };
  let service: RolesService;

  beforeEach(() => {
    prisma = {
      catRole: {
        findMany: jest.fn<Promise<unknown[]>, [CatRoleFindManyArgs?]>(),
        findUnique: jest.fn(),
      },
    };

    service = new RolesService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns every role sorted by name, translated to RoleName', async () => {
      prisma.catRole.findMany.mockResolvedValue([
        buildRole(RoleName.ADMIN),
        buildRole(RoleName.LEADER),
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ name: 'Administrador', roleName: RoleName.ADMIN });
      expect(result[1]).toMatchObject({ name: 'Líder', roleName: RoleName.LEADER });
      const [findManyArgs] = prisma.catRole.findMany.mock.calls[0] ?? [];
      expect(findManyArgs).toEqual({ orderBy: { name: 'asc' } });
    });

    it('returns an empty array when no roles exist', async () => {
      prisma.catRole.findMany.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the sanitized role when found', async () => {
      prisma.catRole.findUnique.mockResolvedValue(buildRole(RoleName.DISTRICT_PASTOR));

      const result = await service.findOne('role-DISTRICT_PASTOR');

      expect(result).toMatchObject({
        id: 'role-DISTRICT_PASTOR',
        name: 'Pastor Distrito',
        roleName: RoleName.DISTRICT_PASTOR,
      });
    });

    it('throws 404 when the role does not exist', async () => {
      prisma.catRole.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
