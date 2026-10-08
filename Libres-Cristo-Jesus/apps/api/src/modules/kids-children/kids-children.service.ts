import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KidsConsentStatus, Prisma, type KidsChild, type KidsGuardian } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { CreateKidsChildDto } from './dto/create-kids-child.dto';
import type { CreateKidsGuardianDto } from './dto/create-kids-guardian.dto';
import type { KidsChildDetailResponseDto } from './dto/kids-child-detail-response.dto';
import type { KidsChildGuardianResponseDto } from './dto/kids-child-guardian-response.dto';
import type { KidsChildResponseDto } from './dto/kids-child-response.dto';
import type { KidsConsentResponseDto } from './dto/kids-consent-response.dto';
import type { KidsGuardianResponseDto } from './dto/kids-guardian-response.dto';
import type { UpdateKidsChildDto } from './dto/update-kids-child.dto';
import type { UpdateKidsConsentDto } from './dto/update-kids-consent.dto';
import type { UpdateKidsGuardianDto } from './dto/update-kids-guardian.dto';

const SCHOOL_NOT_FOUND_MESSAGE = 'KidsSchool not found';
const CHILD_NOT_FOUND_MESSAGE = 'KidsChild not found';
const GUARDIAN_NOT_FOUND_MESSAGE = 'KidsGuardian not found';
const CONSENT_NOT_FOUND_MESSAGE = 'KidsConsent not found';
const VERSION_CONFLICT_MESSAGE = 'The record was modified by someone else — refresh and try again';
const GUARDIAN_FIELDS_REQUIRED_MESSAGE =
  'firstName, lastName, relationship and phone are required to create a new KidsGuardian (or pass guardianId to link an existing one)';
const ALREADY_LINKED_MESSAGE = 'This KidsGuardian is already linked to this KidsChild';
const CONSENT_NOTHING_TO_UPDATE_MESSAGE = 'Provide either documentPath (to upload/replace) or status';

type KidsChildWithProfile = KidsChild & {
  guardians: { id: string; kidsChildId: string; isPrimary: boolean; kidsGuardian: KidsGuardian }[];
  consent: NonNullable<Awaited<ReturnType<PrismaService['kidsConsent']['findUnique']>>>;
};

/**
 * `KidsChild` + `KidsGuardian`/`KidsChildGuardian` + `KidsConsent` — Fase 11,
 * tercera parte ("Escuela Kids"). No reutiliza `Person` (dominio aparte,
 * decisión ya aprobada). KIDS_LEADER y KIDS_ASSISTANT tienen acceso
 * operativo IDÉNTICO acá — la diferencia entre ambos es administrativa
 * (sedes/asignaciones, `KidsSchoolsService`), no algo que este service deba
 * distinguir.
 */
@Injectable()
export class KidsChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea el niño Y su `KidsConsent` en `PENDING_AUTHORIZATION` en la misma
   * transacción — RN definitiva: nunca debe quedar un niño sin su registro
   * de consentimiento.
   */
  async createChild(
    schoolId: string,
    dto: CreateKidsChildDto,
    actor: JwtPayload,
  ): Promise<KidsChildDetailResponseDto> {
    await this.findActiveSchoolOrThrow(schoolId);

    const child = await this.prisma.$transaction(async (tx) => {
      const created = await tx.kidsChild.create({
        data: {
          kidsSchoolId: schoolId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: new Date(dto.birthDate),
          photo: dto.photo ?? null,
          notes: dto.notes ?? null,
          createdBy: actor.sub,
        },
      });

      await tx.kidsConsent.create({
        data: {
          kidsChildId: created.id,
          status: KidsConsentStatus.PENDING_AUTHORIZATION,
          createdBy: actor.sub,
        },
      });

      return created;
    });

    return this.getChild(child.id);
  }

  /** Roster de una sede — fuente del checklist de asistencia (Fase 4). */
  async listChildren(schoolId: string): Promise<KidsChildResponseDto[]> {
    await this.findActiveSchoolOrThrow(schoolId);

    const children = await this.prisma.kidsChild.findMany({
      where: { kidsSchoolId: schoolId, deletedAt: null },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return children.map((child) => this.toChildResponse(child));
  }

  /**
   * Perfil completo. La autorización se muestra SIEMPRE, sea cual sea su
   * estado — RN definitiva: la falta de autorización nunca oculta ni borra
   * al niño.
   */
  async getChild(id: string): Promise<KidsChildDetailResponseDto> {
    const child = (await this.prisma.kidsChild.findFirst({
      where: { id, deletedAt: null },
      include: {
        guardians: { where: { deletedAt: null }, include: { kidsGuardian: true } },
        consent: true,
      },
    })) as KidsChildWithProfile | null;

    if (!child) {
      throw new NotFoundException(CHILD_NOT_FOUND_MESSAGE);
    }

    return this.toDetailResponse(child);
  }

  async updateChild(
    id: string,
    dto: UpdateKidsChildDto,
    actor: JwtPayload,
  ): Promise<KidsChildDetailResponseDto> {
    const child = await this.findActiveChildOrThrow(id);

    if (child.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    await this.prisma.kidsChild.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        photo: dto.photo === undefined ? undefined : dto.photo,
        notes: dto.notes === undefined ? undefined : dto.notes,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.getChild(id);
  }

  /**
   * Vincula un acudiente al niño — crea uno nuevo, o vincula uno existente
   * (`dto.guardianId`, para hermanos que ya comparten acudiente sin
   * duplicarlo). `isPrimary: true` desmarca cualquier otro principal del
   * mismo niño primero (a lo sumo un principal por niño).
   */
  async addGuardian(
    childId: string,
    dto: CreateKidsGuardianDto,
    actor: JwtPayload,
  ): Promise<KidsChildGuardianResponseDto> {
    await this.findActiveChildOrThrow(childId);

    const guardianId = dto.guardianId
      ? await this.assertGuardianExists(dto.guardianId)
      : await this.createGuardian(dto, actor);

    if (dto.isPrimary) {
      await this.prisma.kidsChildGuardian.updateMany({
        where: { kidsChildId: childId, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    try {
      const link = await this.prisma.kidsChildGuardian.create({
        data: {
          kidsChildId: childId,
          kidsGuardianId: guardianId,
          isPrimary: dto.isPrimary ?? false,
          createdBy: actor.sub,
        },
        include: { kidsGuardian: true },
      });

      return this.toChildGuardianResponse(link);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ALREADY_LINKED_MESSAGE);
      }
      throw error;
    }
  }

  async updateGuardian(
    id: string,
    dto: UpdateKidsGuardianDto,
    actor: JwtPayload,
  ): Promise<KidsGuardianResponseDto> {
    const guardian = await this.prisma.kidsGuardian.findFirst({ where: { id, deletedAt: null } });

    if (!guardian) {
      throw new NotFoundException(GUARDIAN_NOT_FOUND_MESSAGE);
    }

    if (guardian.version !== dto.version) {
      throw new ConflictException(VERSION_CONFLICT_MESSAGE);
    }

    const updated = await this.prisma.kidsGuardian.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        relationship: dto.relationship ?? undefined,
        phone: dto.phone ?? undefined,
        altPhone: dto.altPhone === undefined ? undefined : dto.altPhone,
        email: dto.email === undefined ? undefined : dto.email,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.toGuardianResponse(updated);
  }

  /**
   * `documentPath` presente (primera carga o reemplazo) siempre activa —
   * cargar el documento firmado ES la activación, sin importar el estado
   * anterior. Sin `documentPath`, `status` permite una transición manual
   * explícita (ej. revocar a INACTIVE) sin tocar el documento ya cargado.
   */
  async updateConsent(
    childId: string,
    dto: UpdateKidsConsentDto,
    actor: JwtPayload,
  ): Promise<KidsConsentResponseDto> {
    await this.findActiveChildOrThrow(childId);

    const consent = await this.prisma.kidsConsent.findUnique({ where: { kidsChildId: childId } });
    if (!consent) {
      throw new NotFoundException(CONSENT_NOT_FOUND_MESSAGE);
    }

    const data: Prisma.KidsConsentUpdateInput = { updatedBy: actor.sub, version: { increment: 1 } };

    if (dto.documentPath) {
      data.documentPath = dto.documentPath;
      data.status = KidsConsentStatus.ACTIVE;
      data.uploadedAt = new Date();
      data.uploadedBy = actor.sub;
      if (dto.signedAt) {
        data.signedAt = new Date(dto.signedAt);
      }
    } else if (dto.status) {
      data.status = dto.status;
    } else {
      throw new BadRequestException(CONSENT_NOTHING_TO_UPDATE_MESSAGE);
    }

    const updated = await this.prisma.kidsConsent.update({ where: { kidsChildId: childId }, data });
    return this.toConsentResponse(updated);
  }

  private async findActiveSchoolOrThrow(id: string): Promise<{ id: string }> {
    const school = await this.prisma.kidsSchool.findFirst({ where: { id, deletedAt: null } });
    if (!school) {
      throw new NotFoundException(SCHOOL_NOT_FOUND_MESSAGE);
    }
    return school;
  }

  private async findActiveChildOrThrow(id: string): Promise<KidsChild> {
    const child = await this.prisma.kidsChild.findFirst({ where: { id, deletedAt: null } });
    if (!child) {
      throw new NotFoundException(CHILD_NOT_FOUND_MESSAGE);
    }
    return child;
  }

  private async assertGuardianExists(id: string): Promise<string> {
    const guardian = await this.prisma.kidsGuardian.findFirst({ where: { id, deletedAt: null } });
    if (!guardian) {
      throw new NotFoundException(GUARDIAN_NOT_FOUND_MESSAGE);
    }
    return guardian.id;
  }

  private async createGuardian(dto: CreateKidsGuardianDto, actor: JwtPayload): Promise<string> {
    if (!dto.firstName || !dto.lastName || !dto.relationship || !dto.phone) {
      throw new BadRequestException(GUARDIAN_FIELDS_REQUIRED_MESSAGE);
    }

    const guardian = await this.prisma.kidsGuardian.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        relationship: dto.relationship,
        phone: dto.phone,
        altPhone: dto.altPhone ?? null,
        email: dto.email ?? null,
        createdBy: actor.sub,
      },
    });

    return guardian.id;
  }

  private toChildResponse(child: KidsChild): KidsChildResponseDto {
    return {
      id: child.id,
      kidsSchoolId: child.kidsSchoolId,
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      age: calculateAge(child.birthDate),
      photo: child.photo,
      notes: child.notes,
      status: child.status,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
      createdBy: child.createdBy,
      updatedBy: child.updatedBy,
      version: child.version,
    };
  }

  private toDetailResponse(child: KidsChildWithProfile): KidsChildDetailResponseDto {
    return {
      ...this.toChildResponse(child),
      guardians: child.guardians.map((link) => this.toChildGuardianResponse(link)),
      consent: this.toConsentResponse(child.consent),
    };
  }

  private toChildGuardianResponse(link: {
    id: string;
    kidsChildId: string;
    isPrimary: boolean;
    kidsGuardian: KidsGuardian;
  }): KidsChildGuardianResponseDto {
    return {
      id: link.id,
      kidsChildId: link.kidsChildId,
      isPrimary: link.isPrimary,
      guardian: this.toGuardianResponse(link.kidsGuardian),
    };
  }

  private toGuardianResponse(guardian: KidsGuardian): KidsGuardianResponseDto {
    return {
      id: guardian.id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      relationship: guardian.relationship,
      phone: guardian.phone,
      altPhone: guardian.altPhone,
      email: guardian.email,
      createdAt: guardian.createdAt,
      updatedAt: guardian.updatedAt,
      version: guardian.version,
    };
  }

  private toConsentResponse(
    consent: NonNullable<Awaited<ReturnType<PrismaService['kidsConsent']['findUnique']>>>,
  ): KidsConsentResponseDto {
    return {
      id: consent.id,
      kidsChildId: consent.kidsChildId,
      status: consent.status,
      documentPath: consent.documentPath,
      signedAt: consent.signedAt,
      uploadedAt: consent.uploadedAt,
      uploadedBy: consent.uploadedBy,
      createdAt: consent.createdAt,
      updatedAt: consent.updatedAt,
      version: consent.version,
    };
  }
}

/** Nunca se persiste — se recalcula en cada respuesta desde `birthDate` (RN definitiva del diseño aprobado). */
function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}
