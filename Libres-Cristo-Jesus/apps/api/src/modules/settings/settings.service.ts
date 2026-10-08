import { Injectable, NotFoundException } from '@nestjs/common';
import { RecordStatus, type SystemSetting } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { UpsertSettingDto } from './dto/upsert-setting.dto';
import type { SettingResponseDto } from './dto/setting-response.dto';

const SETTING_NOT_FOUND_MESSAGE = 'Setting not found';

/**
 * `SystemSetting` — the "Configuración general" of the Iglesia module
 * (doc04 "Mejoras" §3: church name, logo, institutional colours, session
 * duration, PWA configuration, general rules).
 *
 * A table rather than constants in code so an administrator changes a
 * parameter without a deployment — which is the entire justification
 * doc04 gives for it.
 *
 * NOT paginated: this is a small, bounded configuration set an
 * administrator reads as a single screen. Paginating settings would be
 * ceremony over a list that fits on one page by construction.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every active setting, alphabetically — the order a config screen reads. */
  async findAll(): Promise<SettingResponseDto[]> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { deletedAt: null },
      orderBy: { key: 'asc' },
    });

    return settings.map((setting) => this.toResponse(setting));
  }

  async findOne(key: string): Promise<SettingResponseDto> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: { key, deletedAt: null },
    });

    if (!setting) {
      throw new NotFoundException(SETTING_NOT_FOUND_MESSAGE);
    }

    return this.toResponse(setting);
  }

  /**
   * Creates the key or updates it in place.
   *
   * `version` is incremented on update so the row keeps the same
   * optimistic-locking story as every other "tabla principal", even though
   * the endpoint itself does not require the caller to send it: settings
   * are edited one at a time by an administrator, not concurrently by a
   * team, so demanding a version here would be friction without a
   * conflict to prevent.
   *
   * A soft-deleted key is revived rather than duplicated — `key` is unique
   * across ALL rows regardless of `deletedAt`, so inserting would violate
   * the constraint and surface as an opaque 500.
   */
  async upsert(key: string, dto: UpsertSettingDto, actor: JwtPayload): Promise<SettingResponseDto> {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: dto.value,
        description: dto.description ?? null,
        createdBy: actor.sub,
      },
      update: {
        value: dto.value,
        description: dto.description ?? undefined,
        updatedBy: actor.sub,
        // Reviving: an administrator setting a key that was removed means
        // they want it back, not a second row they cannot create.
        deletedAt: null,
        deletedBy: null,
        status: RecordStatus.ACTIVE,
        version: { increment: 1 },
      },
    });

    return this.toResponse(setting);
  }

  async remove(key: string, actor: JwtPayload): Promise<void> {
    await this.findOne(key);

    await this.prisma.systemSetting.update({
      where: { key },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  private toResponse(setting: SystemSetting): SettingResponseDto {
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      status: setting.status,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
      version: setting.version,
    };
  }
}
