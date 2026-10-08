import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { PeopleService } from './people.service';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const adminActor: JwtPayload = {
  sub: 'unit-admin',
  memberId: 'member-admin',
  username: 'admin',
  role: RoleName.ADMIN,
};
const leaderActor: JwtPayload = {
  sub: 'unit-leader',
  memberId: 'member-leader',
  username: 'lider',
  role: RoleName.LEADER,
};
const districtPastorActor: JwtPayload = {
  sub: 'unit-pastor',
  memberId: 'member-pastor',
  username: 'pastor',
  role: RoleName.DISTRICT_PASTOR,
};

interface PersonCreateArgs {
  data: Record<string, unknown>;
}

interface PersonUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

interface PersonFindManyArgs {
  where: Record<string, unknown>;
}

interface HistoryCreateArgs {
  data: Record<string, unknown>;
}

interface HistoryUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
}

/** `Person` as the service reads it back, with the relations it includes. */
function buildPerson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'person-1',
    firstName: 'María',
    lastName: 'González',
    document: null,
    gender: null,
    phone: null,
    email: null,
    birthDate: null,
    address: null,
    photo: null,
    notes: null,
    personStageId: null,
    personStage: null,
    peaceHouseHistory: [],
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

const baseCreateDto: CreatePersonDto = {
  firstName: 'María',
  lastName: 'González',
};

describe('PeopleService', () => {
  let prisma: {
    person: {
      findFirst: jest.Mock;
      findMany: jest.Mock<Promise<unknown[]>, [PersonFindManyArgs]>;
      count: jest.Mock<Promise<unknown>, [PersonFindManyArgs]>;
      create: jest.Mock<Promise<unknown>, [PersonCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [PersonUpdateArgs]>;
    };
    personPeaceHouseHistory: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock<Promise<unknown>, [HistoryCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [HistoryUpdateArgs]>;
    };
    catPersonStage: { findFirst: jest.Mock };
    peaceHouse: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: PeopleService;

  beforeEach(() => {
    prisma = {
      person: {
        findFirst: jest.fn(),
        findMany: jest.fn<Promise<unknown[]>, [PersonFindManyArgs]>().mockResolvedValue([]),
        count: jest.fn<Promise<unknown>, [PersonFindManyArgs]>().mockResolvedValue(0),
        create: jest.fn<Promise<unknown>, [PersonCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [PersonUpdateArgs]>(),
      },
      personPeaceHouseHistory: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn<Promise<unknown>, [HistoryCreateArgs]>().mockResolvedValue({}),
        update: jest.fn<Promise<unknown>, [HistoryUpdateArgs]>().mockResolvedValue({}),
      },
      catPersonStage: { findFirst: jest.fn() },
      peaceHouse: { findFirst: jest.fn() },
      // Mirrors `PeaceHousesService`'s spec: the callback form receives this
      // same object as `tx`, and the array form resolves in parallel.
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new PeopleService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a person with only first and last name', async () => {
      prisma.person.create.mockResolvedValue(buildPerson());
      prisma.person.findFirst.mockResolvedValue(buildPerson());

      const result = await service.create(baseCreateDto, adminActor);

      expect(result).toMatchObject({ id: 'person-1', firstName: 'María' });
      const [createArgs] = prisma.person.create.mock.calls[0]!;
      expect(createArgs.data.createdBy).toBe(adminActor.sub);
      // No Casa de Paz given -> no membership period opened.
      expect(prisma.personPeaceHouseHistory.create).not.toHaveBeenCalled();
    });

    it('opens the first membership period when a Casa de Paz is given', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.person.create.mockResolvedValue(buildPerson());
      prisma.person.findFirst.mockResolvedValue(buildPerson());

      await service.create({ ...baseCreateDto, peaceHouseId: 'house-1' }, adminActor);

      const [historyArgs] = prisma.personPeaceHouseHistory.create.mock.calls[0]!;
      expect(historyArgs.data).toMatchObject({
        personId: 'person-1',
        peaceHouseId: 'house-1',
        createdBy: adminActor.sub,
      });
      // The opening period must stay open.
      expect(historyArgs.data.endDate).toBeUndefined();
    });

    it('rejects a duplicate document with 409', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson({ id: 'someone-else' }));

      await expect(
        service.create({ ...baseCreateDto, document: 'CC-123' }, adminActor),
      ).rejects.toThrow(ConflictException);
      expect(prisma.person.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown personStageId with 400', async () => {
      prisma.catPersonStage.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ ...baseCreateDto, personStageId: 'ghost-stage' }, adminActor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.person.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown peaceHouseId with 404', async () => {
      prisma.peaceHouse.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ ...baseCreateDto, peaceHouseId: 'ghost-house' }, adminActor),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.person.create).not.toHaveBeenCalled();
    });
  });

  /**
   * doc05 Policies 1-2. This is the half `ScopeGuard` cannot cover: a list
   * has no resource id, so the narrowing must reach the `where` clause.
   */
  describe('findAll — scope por rol', () => {
    const query = { page: 1, pageSize: 20, order: 'asc' as const };

    it('does not narrow anything for an Administrador', async () => {
      await service.findAll(query, adminActor);

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      expect(countArgs.where).not.toHaveProperty('peaceHouseHistory');
    });

    it('does not narrow anything for a Pastor General', async () => {
      await service.findAll(query, {
        ...adminActor,
        role: RoleName.GENERAL_PASTOR,
      });

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      expect(countArgs.where).not.toHaveProperty('peaceHouseHistory');
    });

    it('narrows a Líder to the people of their own Casa de Paz', async () => {
      await service.findAll(query, leaderActor);

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      expect(countArgs.where).toMatchObject({
        peaceHouseHistory: {
          some: {
            endDate: null,
            deletedAt: null,
            peaceHouse: { leadershipUnitId: leaderActor.sub },
          },
        },
      });
    });

    it('narrows a Pastor de Distrito to the people of their district', async () => {
      await service.findAll(query, districtPastorActor);

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      expect(countArgs.where).toMatchObject({
        peaceHouseHistory: {
          some: {
            endDate: null,
            deletedAt: null,
            peaceHouse: { district: { leadershipUnitId: districtPastorActor.sub } },
          },
        },
      });
    });

    it('treats a peaceHouseId filter as the CURRENT roster, not history', async () => {
      await service.findAll({ ...query, peaceHouseId: 'house-1' }, adminActor);

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      // `endDate: null` is what keeps someone who left last year out of it.
      expect(countArgs.where).toMatchObject({
        peaceHouseHistory: { some: { peaceHouseId: 'house-1', endDate: null } },
      });
    });

    it('searches across name, document, phone and email', async () => {
      await service.findAll({ ...query, search: 'maria' }, adminActor);

      const [countArgs] = prisma.person.count.mock.calls[0]!;
      const or = countArgs.where.OR as Record<string, unknown>[];
      expect(or).toHaveLength(5);
    });
  });

  describe('findOne', () => {
    it('resolves the current Casa de Paz from the open period', async () => {
      prisma.person.findFirst.mockResolvedValue(
        buildPerson({ peaceHouseHistory: [{ peaceHouseId: 'house-9' }] }),
      );

      const result = await service.findOne('person-1');

      expect(result.currentPeaceHouseId).toBe('house-9');
    });

    it('reports no current house when there is no open period', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson({ peaceHouseHistory: [] }));

      const result = await service.findOne('person-1');

      expect(result.currentPeaceHouseId).toBeNull();
    });

    it('throws 404 when the person does not exist or was deleted', async () => {
      prisma.person.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a stale version with 409', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson({ version: 3 }));

      await expect(
        service.update('person-1', { ...baseCreateDto, version: 1 }, adminActor),
      ).rejects.toThrow(ConflictException);
      expect(prisma.person.update).not.toHaveBeenCalled();
    });

    it('increments the version and stamps updatedBy', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson());
      prisma.person.update.mockResolvedValue(buildPerson());

      await service.update('person-1', { ...baseCreateDto, version: 1 }, adminActor);

      const [updateArgs] = prisma.person.update.mock.calls[0]!;
      expect(updateArgs.data.updatedBy).toBe(adminActor.sub);
      expect(updateArgs.data.version).toEqual({ increment: 1 });
    });
  });

  describe('transfer', () => {
    it('closes the open period and opens a new one', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson());
      prisma.peaceHouse.findFirst.mockResolvedValue({ id: 'house-2' });
      prisma.personPeaceHouseHistory.findFirst.mockResolvedValue({
        id: 'history-1',
        peaceHouseId: 'house-1',
      });

      await service.transfer('person-1', { peaceHouseId: 'house-2' }, adminActor);

      const [closeArgs] = prisma.personPeaceHouseHistory.update.mock.calls[0]!;
      expect(closeArgs.where).toEqual({ id: 'history-1' });
      expect(closeArgs.data.endDate).toBeInstanceOf(Date);

      const [openArgs] = prisma.personPeaceHouseHistory.create.mock.calls[0]!;
      expect(openArgs.data).toMatchObject({ personId: 'person-1', peaceHouseId: 'house-2' });
    });

    it('is a no-op when the person is already in that Casa de Paz', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson());
      prisma.peaceHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.personPeaceHouseHistory.findFirst.mockResolvedValue({
        id: 'history-1',
        peaceHouseId: 'house-1',
      });

      await service.transfer('person-1', { peaceHouseId: 'house-1' }, adminActor);

      // Re-saving a form without touching the house must not manufacture a
      // transfer that never happened.
      expect(prisma.personPeaceHouseHistory.update).not.toHaveBeenCalled();
      expect(prisma.personPeaceHouseHistory.create).not.toHaveBeenCalled();
    });

    it('opens the first period when the person had none', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson());
      prisma.peaceHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.personPeaceHouseHistory.findFirst.mockResolvedValue(null);

      await service.transfer('person-1', { peaceHouseId: 'house-1' }, adminActor);

      expect(prisma.personPeaceHouseHistory.update).not.toHaveBeenCalled();
      expect(prisma.personPeaceHouseHistory.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes and leaves the membership history intact', async () => {
      prisma.person.findFirst.mockResolvedValue(buildPerson());
      prisma.person.update.mockResolvedValue(buildPerson());

      await service.remove('person-1', adminActor);

      const [updateArgs] = prisma.person.update.mock.calls[0]!;
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedBy).toBe(adminActor.sub);
      expect(updateArgs.data.status).toBe(RecordStatus.INACTIVE);
      // Someone who leaves the system did not stop having belonged to their
      // house — rewriting that would corrupt every past attendance report.
      expect(prisma.personPeaceHouseHistory.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the person does not exist', async () => {
      prisma.person.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing', adminActor)).rejects.toThrow(NotFoundException);
      expect(prisma.person.update).not.toHaveBeenCalled();
    });
  });
});
