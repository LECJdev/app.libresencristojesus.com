import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { PermissionsService } from './permissions.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';

const adminActor: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};

function buildPermission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'permission-1',
    resource: 'district',
    action: 'create',
    description: 'district module — create',
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

function buildRolePermission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-1',
    roleId: 'role-ADMIN',
    permissionId: 'permission-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    permission: buildPermission(),
    ...overrides,
  };
}

const baseCreateDto: CreatePermissionDto = {
  resource: 'district',
  action: 'create',
  description: 'district module — create',
};

const baseAssignmentDto: CreateRoleAssignmentDto = {
  roleId: 'role-ADMIN',
  permissionId: 'permission-1',
};

interface PermissionCreateArgs {
  data: Record<string, unknown>;
}

interface PermissionUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

describe('PermissionsService', () => {
  let prisma: {
    permission: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock<Promise<unknown>, [PermissionCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [PermissionUpdateArgs]>;
    };
    rolePermission: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    catRole: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: PermissionsService;

  beforeEach(() => {
    prisma = {
      permission: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn<Promise<unknown>, [PermissionCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [PermissionUpdateArgs]>(),
      },
      rolePermission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      catRole: { findUnique: jest.fn() },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new PermissionsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a permission', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);
      prisma.permission.create.mockResolvedValue(buildPermission());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).toMatchObject({ id: 'permission-1', resource: 'district', action: 'create' });
      const [createArgs] = prisma.permission.create.mock.calls[0]!;
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
    });

    it('rejects a duplicate (resource, action) pair with 409', async () => {
      prisma.permission.findUnique.mockResolvedValue(buildPermission());

      await expect(service.create(baseCreateDto, adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.permission.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the description and increments version', async () => {
      prisma.permission.findFirst.mockResolvedValue(buildPermission());
      prisma.permission.update.mockResolvedValue(
        buildPermission({ description: 'new description', version: 2 }),
      );

      const result = await service.update(
        'permission-1',
        { description: 'new description' },
        adminActor,
      );

      const [updateArgs] = prisma.permission.update.mock.calls[0]!;
      expect(updateArgs.where).toEqual({ id: 'permission-1' });
      expect(updateArgs.data.description).toBe('new description');
      expect(updateArgs.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
      expect(result.description).toBe('new description');
    });

    it('throws 404 when the permission does not exist (or is soft-deleted)', async () => {
      prisma.permission.findFirst.mockResolvedValue(null);

      await expect(service.update('missing-id', { description: 'x' }, adminActor)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.permission.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes when there are no active grants', async () => {
      prisma.permission.findFirst.mockResolvedValue(buildPermission());
      prisma.rolePermission.count.mockResolvedValue(0);
      prisma.permission.update.mockResolvedValue(undefined);

      await service.remove('permission-1', adminActor);

      const [updateArgs] = prisma.permission.update.mock.calls[0]!;
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs.data.status).toBe(RecordStatus.INACTIVE);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
    });

    it('rejects with 409 when the permission still has active RolePermission grants', async () => {
      prisma.permission.findFirst.mockResolvedValue(buildPermission());
      prisma.rolePermission.count.mockResolvedValue(2);

      await expect(service.remove('permission-1', adminActor)).rejects.toThrow(ConflictException);
      expect(prisma.permission.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the permission does not exist (or is already deleted)', async () => {
      prisma.permission.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.rolePermission.count).not.toHaveBeenCalled();
    });
  });

  describe('createRoleAssignment', () => {
    it('grants a permission to a role', async () => {
      prisma.catRole.findUnique.mockResolvedValue({ id: 'role-ADMIN', name: 'Administrador' });
      prisma.permission.findFirst.mockResolvedValue(buildPermission());
      prisma.rolePermission.findUnique.mockResolvedValue(null);
      prisma.rolePermission.create.mockResolvedValue(buildRolePermission());

      const result = await service.createRoleAssignment(baseAssignmentDto);

      expect(result).toMatchObject({
        id: 'grant-1',
        roleId: 'role-ADMIN',
        permissionId: 'permission-1',
      });
      expect(result.permission.resource).toBe('district');
    });

    it('rejects when roleId does not match any CatRole', async () => {
      prisma.catRole.findUnique.mockResolvedValue(null);

      await expect(service.createRoleAssignment(baseAssignmentDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.rolePermission.create).not.toHaveBeenCalled();
    });

    it('rejects when permissionId does not match any active Permission', async () => {
      prisma.catRole.findUnique.mockResolvedValue({ id: 'role-ADMIN', name: 'Administrador' });
      prisma.permission.findFirst.mockResolvedValue(null);

      await expect(service.createRoleAssignment(baseAssignmentDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.rolePermission.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate grant with 409 (not idempotent — see PermissionsService doc comment)', async () => {
      prisma.catRole.findUnique.mockResolvedValue({ id: 'role-ADMIN', name: 'Administrador' });
      prisma.permission.findFirst.mockResolvedValue(buildPermission());
      prisma.rolePermission.findUnique.mockResolvedValue(buildRolePermission());

      await expect(service.createRoleAssignment(baseAssignmentDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.rolePermission.create).not.toHaveBeenCalled();
    });
  });

  describe('removeRoleAssignment', () => {
    it('revokes an existing grant', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(buildRolePermission());
      prisma.rolePermission.delete.mockResolvedValue(undefined);

      await service.removeRoleAssignment('grant-1');

      expect(prisma.rolePermission.delete).toHaveBeenCalledWith({ where: { id: 'grant-1' } });
    });

    it('throws 404 when the grant does not exist', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      await expect(service.removeRoleAssignment('missing-id')).rejects.toThrow(NotFoundException);
      expect(prisma.rolePermission.delete).not.toHaveBeenCalled();
    });
  });

  describe('findRolePermissions', () => {
    it('lists every permission granted to a role', async () => {
      prisma.catRole.findUnique.mockResolvedValue({ id: 'role-ADMIN', name: 'Administrador' });
      prisma.rolePermission.findMany.mockResolvedValue([buildRolePermission()]);

      const result = await service.findRolePermissions('role-ADMIN');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ roleId: 'role-ADMIN', permissionId: 'permission-1' });
    });

    it('throws 404 when the role does not exist', async () => {
      prisma.catRole.findUnique.mockResolvedValue(null);

      await expect(service.findRolePermissions('missing-id')).rejects.toThrow(NotFoundException);
      expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
    });
  });
});
