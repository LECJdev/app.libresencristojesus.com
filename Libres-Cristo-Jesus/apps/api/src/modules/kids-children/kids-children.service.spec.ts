import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { KidsConsentStatus, Prisma, RecordStatus } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { KidsChildrenService } from './kids-children.service';
import type { CreateKidsChildDto } from './dto/create-kids-child.dto';
import type { CreateKidsGuardianDto } from './dto/create-kids-guardian.dto';
import type { UpdateKidsChildDto } from './dto/update-kids-child.dto';
import type { UpdateKidsConsentDto } from './dto/update-kids-consent.dto';
import type { UpdateKidsGuardianDto } from './dto/update-kids-guardian.dto';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const leaderActor: JwtPayload = {
  sub: 'unit-kids-leader-norte',
  memberId: 'member-kids-leader-norte',
  username: 'kidsleadernorte',
  role: RoleName.KIDS_LEADER,
};

function buildSchool(overrides: Record<string, unknown> = {}) {
  return { id: 'school-norte', name: 'Escuela Kids Norte', deletedAt: null, ...overrides };
}

function buildChild(overrides: Record<string, unknown> = {}) {
  return {
    id: 'child-1',
    kidsSchoolId: 'school-norte',
    firstName: 'Sofía',
    lastName: 'Ramírez',
    birthDate: new Date('2019-03-14T00:00:00Z'),
    photo: null,
    notes: null,
    status: RecordStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'unit-kids-leader-norte',
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...overrides,
  };
}

function buildGuardian(overrides: Record<string, unknown> = {}) {
  return {
    id: 'guardian-1',
    firstName: 'Marta',
    lastName: 'Ramírez',
    relationship: 'madre',
    phone: '3001234567',
    altPhone: null,
    email: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'unit-kids-leader-norte',
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...overrides,
  };
}

function buildConsent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'consent-1',
    kidsChildId: 'child-1',
    status: KidsConsentStatus.PENDING_AUTHORIZATION,
    documentPath: null,
    signedAt: null,
    uploadedAt: null,
    uploadedBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'unit-kids-leader-norte',
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...overrides,
  };
}

/** Typed so `.mock.calls[0][0]` assertions stay type-safe instead of reaching into `any` — same pattern as `kids-schools.service.spec.ts`. */
interface WhereArgs {
  where: Record<string, unknown>;
  include?: unknown;
  orderBy?: unknown;
}
interface CreateArgs {
  data: Record<string, unknown>;
  include?: unknown;
}
interface UpdateArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}
interface UpdateManyArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

describe('KidsChildrenService', () => {
  let prisma: {
    kidsSchool: { findFirst: jest.Mock<Promise<unknown>, [WhereArgs]> };
    kidsChild: {
      findFirst: jest.Mock<Promise<unknown>, [WhereArgs]>;
      findMany: jest.Mock<Promise<unknown>, [WhereArgs]>;
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      update: jest.Mock<Promise<unknown>, [UpdateArgs]>;
    };
    kidsGuardian: {
      findFirst: jest.Mock<Promise<unknown>, [WhereArgs]>;
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      update: jest.Mock<Promise<unknown>, [UpdateArgs]>;
    };
    kidsChildGuardian: {
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      updateMany: jest.Mock<Promise<unknown>, [UpdateManyArgs]>;
    };
    kidsConsent: {
      create: jest.Mock<Promise<unknown>, [CreateArgs]>;
      findUnique: jest.Mock<Promise<unknown>, [WhereArgs]>;
      update: jest.Mock<Promise<unknown>, [UpdateArgs]>;
    };
    $transaction: jest.Mock;
  };
  let service: KidsChildrenService;

  beforeEach(() => {
    prisma = {
      kidsSchool: { findFirst: jest.fn<Promise<unknown>, [WhereArgs]>() },
      kidsChild: {
        findFirst: jest.fn<Promise<unknown>, [WhereArgs]>(),
        findMany: jest.fn<Promise<unknown>, [WhereArgs]>(),
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        update: jest.fn<Promise<unknown>, [UpdateArgs]>(),
      },
      kidsGuardian: {
        findFirst: jest.fn<Promise<unknown>, [WhereArgs]>(),
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        update: jest.fn<Promise<unknown>, [UpdateArgs]>(),
      },
      kidsChildGuardian: {
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        updateMany: jest
          .fn<Promise<unknown>, [UpdateManyArgs]>()
          .mockResolvedValue({ count: 0 }),
      },
      kidsConsent: {
        create: jest.fn<Promise<unknown>, [CreateArgs]>(),
        findUnique: jest.fn<Promise<unknown>, [WhereArgs]>(),
        update: jest.fn<Promise<unknown>, [UpdateArgs]>(),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };
    prisma.kidsSchool.findFirst.mockResolvedValue(buildSchool());

    service = new KidsChildrenService(prisma as unknown as PrismaService);
  });

  describe('createChild', () => {
    const baseDto: CreateKidsChildDto = {
      firstName: 'Sofía',
      lastName: 'Ramírez',
      birthDate: '2019-03-14',
    };

    it('creates the child AND its PENDING_AUTHORIZATION consent in the same transaction', async () => {
      prisma.kidsChild.create.mockResolvedValue(buildChild());
      prisma.kidsConsent.create.mockResolvedValue(buildConsent());
      prisma.kidsChild.findFirst.mockResolvedValue({ ...buildChild(), guardians: [], consent: buildConsent() });

      const result = await service.createChild('school-norte', baseDto, leaderActor);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.kidsChild.create).toHaveBeenCalledWith({
        data: {
          kidsSchoolId: 'school-norte',
          firstName: 'Sofía',
          lastName: 'Ramírez',
          birthDate: new Date('2019-03-14'),
          photo: null,
          notes: null,
          createdBy: leaderActor.sub,
        },
      });
      expect(prisma.kidsConsent.create).toHaveBeenCalledWith({
        data: {
          kidsChildId: 'child-1',
          status: KidsConsentStatus.PENDING_AUTHORIZATION,
          createdBy: leaderActor.sub,
        },
      });
      expect(result.consent.status).toBe(KidsConsentStatus.PENDING_AUTHORIZATION);
    });

    it('rejects when the school does not exist or is soft-deleted', async () => {
      prisma.kidsSchool.findFirst.mockResolvedValue(null);

      await expect(service.createChild('school-norte', baseDto, leaderActor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.kidsChild.create).not.toHaveBeenCalled();
    });
  });

  describe('listChildren', () => {
    it('returns the roster with age computed from birthDate, never persisted', async () => {
      prisma.kidsChild.findMany.mockResolvedValue([buildChild({ birthDate: new Date('2019-03-14T00:00:00Z') })]);

      const result = await service.listChildren('school-norte');

      expect(result[0]!.age).toBe(expectedAge(new Date('2019-03-14T00:00:00Z')));
      expect((result[0] as unknown as Record<string, unknown>).birthDate).toBeInstanceOf(Date);
    });
  });

  describe('getChild', () => {
    it('returns the full profile: child + guardians + consent, whatever the consent state is', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue({
        ...buildChild(),
        guardians: [{ id: 'link-1', kidsChildId: 'child-1', isPrimary: true, kidsGuardian: buildGuardian() }],
        consent: buildConsent(),
      });

      const result = await service.getChild('child-1');

      expect(result.guardians).toHaveLength(1);
      expect(result.guardians[0]!.guardian.id).toBe('guardian-1');
      expect(result.consent.status).toBe(KidsConsentStatus.PENDING_AUTHORIZATION);
    });

    it('throws 404 when the child does not exist', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(null);

      await expect(service.getChild('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateChild', () => {
    const dto: UpdateKidsChildDto = { notes: 'Alergia al maní', version: 1 };

    it('rejects a stale version with 409', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild({ version: 2 }));

      await expect(service.updateChild('child-1', dto, leaderActor)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.kidsChild.update).not.toHaveBeenCalled();
    });

    it('updates when the version matches', async () => {
      prisma.kidsChild.findFirst
        .mockResolvedValueOnce(buildChild({ version: 1 }))
        .mockResolvedValueOnce({ ...buildChild(), guardians: [], consent: buildConsent() });
      prisma.kidsChild.update.mockResolvedValue(buildChild({ notes: 'Alergia al maní', version: 2 }));

      await service.updateChild('child-1', dto, leaderActor);

      const [callArgs] = prisma.kidsChild.update.mock.calls[0]!;
      expect(callArgs.where).toEqual({ id: 'child-1' });
      expect(callArgs.data.notes).toBe('Alergia al maní');
      expect(callArgs.data.updatedBy).toBe(leaderActor.sub);
    });
  });

  describe('addGuardian', () => {
    it('creates a new KidsGuardian + link when no guardianId is given', async () => {
      const dto: CreateKidsGuardianDto = {
        firstName: 'Marta',
        lastName: 'Ramírez',
        relationship: 'madre',
        phone: '3001234567',
        isPrimary: true,
      };
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsGuardian.create.mockResolvedValue(buildGuardian());
      prisma.kidsChildGuardian.create.mockResolvedValue({
        id: 'link-1',
        kidsChildId: 'child-1',
        isPrimary: true,
        kidsGuardian: buildGuardian(),
      });

      const result = await service.addGuardian('child-1', dto, leaderActor);

      expect(prisma.kidsGuardian.create).toHaveBeenCalled();
      expect(result.isPrimary).toBe(true);
    });

    it('links an EXISTING guardian instead of duplicating it when guardianId is given (siblings)', async () => {
      const dto: CreateKidsGuardianDto = { guardianId: 'guardian-1' };
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsGuardian.findFirst.mockResolvedValue(buildGuardian());
      prisma.kidsChildGuardian.create.mockResolvedValue({
        id: 'link-2',
        kidsChildId: 'child-1',
        isPrimary: false,
        kidsGuardian: buildGuardian(),
      });

      await service.addGuardian('child-1', dto, leaderActor);

      expect(prisma.kidsGuardian.create).not.toHaveBeenCalled();
      const [callArgs] = prisma.kidsChildGuardian.create.mock.calls[0]!;
      expect(callArgs.data.kidsGuardianId).toBe('guardian-1');
    });

    it('rejects creating a new guardian with missing required fields', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());

      await expect(
        service.addGuardian('child-1', { firstName: 'Marta' }, leaderActor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.kidsGuardian.create).not.toHaveBeenCalled();
    });

    it('unsets the previous primary guardian when a new one is marked primary', async () => {
      const dto: CreateKidsGuardianDto = { guardianId: 'guardian-2', isPrimary: true };
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsGuardian.findFirst.mockResolvedValue(buildGuardian({ id: 'guardian-2' }));
      prisma.kidsChildGuardian.create.mockResolvedValue({
        id: 'link-3',
        kidsChildId: 'child-1',
        isPrimary: true,
        kidsGuardian: buildGuardian({ id: 'guardian-2' }),
      });

      await service.addGuardian('child-1', dto, leaderActor);

      expect(prisma.kidsChildGuardian.updateMany).toHaveBeenCalledWith({
        where: { kidsChildId: 'child-1', deletedAt: null },
        data: { isPrimary: false },
      });
    });

    it('rejects a duplicate child-guardian link with 409', async () => {
      const dto: CreateKidsGuardianDto = { guardianId: 'guardian-1' };
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsGuardian.findFirst.mockResolvedValue(buildGuardian());
      prisma.kidsChildGuardian.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7.9.0' }),
      );

      await expect(service.addGuardian('child-1', dto, leaderActor)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateGuardian', () => {
    it('rejects a stale version with 409', async () => {
      prisma.kidsGuardian.findFirst.mockResolvedValue(buildGuardian({ version: 3 }));
      const dto: UpdateKidsGuardianDto = { phone: '3009999999', version: 1 };

      await expect(service.updateGuardian('guardian-1', dto, leaderActor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when the guardian does not exist', async () => {
      prisma.kidsGuardian.findFirst.mockResolvedValue(null);

      await expect(
        service.updateGuardian('missing', { phone: '300', version: 1 }, leaderActor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateConsent', () => {
    it('activates the consent when a documentPath is uploaded (first load), stamping uploadedAt/uploadedBy', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsConsent.findUnique.mockResolvedValue(buildConsent());
      prisma.kidsConsent.update.mockResolvedValue(
        buildConsent({ status: KidsConsentStatus.ACTIVE, documentPath: 'kids-consent-document/x.pdf' }),
      );
      const dto: UpdateKidsConsentDto = { documentPath: 'kids-consent-document/x.pdf' };

      const result = await service.updateConsent('child-1', dto, leaderActor);

      expect(result.status).toBe(KidsConsentStatus.ACTIVE);
      const [callArgs] = prisma.kidsConsent.update.mock.calls[0]!;
      expect(callArgs.data.status).toBe(KidsConsentStatus.ACTIVE);
      expect(callArgs.data.documentPath).toBe('kids-consent-document/x.pdf');
      expect(callArgs.data.uploadedBy).toBe(leaderActor.sub);
      expect(callArgs.data.uploadedAt).toBeInstanceOf(Date);
    });

    it('activates on REPLACEMENT of an already-ACTIVE document too', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsConsent.findUnique.mockResolvedValue(
        buildConsent({ status: KidsConsentStatus.ACTIVE, documentPath: 'old.pdf' }),
      );
      prisma.kidsConsent.update.mockResolvedValue(buildConsent({ status: KidsConsentStatus.ACTIVE, documentPath: 'new.pdf' }));

      const result = await service.updateConsent('child-1', { documentPath: 'new.pdf' }, leaderActor);

      expect(result.status).toBe(KidsConsentStatus.ACTIVE);
      expect(prisma.kidsConsent.update.mock.calls[0]![0].data.documentPath).toBe('new.pdf');
    });

    it('never deletes the child when consent is revoked to INACTIVE — only the consent status changes', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsConsent.findUnique.mockResolvedValue(buildConsent({ status: KidsConsentStatus.ACTIVE }));
      prisma.kidsConsent.update.mockResolvedValue(buildConsent({ status: KidsConsentStatus.INACTIVE }));

      const result = await service.updateConsent(
        'child-1',
        { status: KidsConsentStatus.INACTIVE },
        leaderActor,
      );

      expect(result.status).toBe(KidsConsentStatus.INACTIVE);
      expect(prisma.kidsChild.update).not.toHaveBeenCalled();
    });

    it('rejects an empty body with 400 (nothing to update)', async () => {
      prisma.kidsChild.findFirst.mockResolvedValue(buildChild());
      prisma.kidsConsent.findUnique.mockResolvedValue(buildConsent());

      await expect(service.updateConsent('child-1', {}, leaderActor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

function expectedAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}
