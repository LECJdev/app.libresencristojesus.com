import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type MeetingPhoto, type Offering } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { AttendanceLockService } from '../attendance/attendance-lock.service';
import type {
  AddMeetingPhotoDto,
  MeetingPhotoResponseDto,
  MeetingReportResponseDto,
  OfferingResponseDto,
  UpdateMeetingPhotoDto,
  UpdateMeetingReportDto,
  UpsertOfferingDto,
} from './dto/meeting-report.dto';

const MEETING_NOT_FOUND = 'La reunión no existe o fue eliminada';
const THEME_NOT_FOUND = 'themeId no corresponde a ningún tema activo';
const PHOTO_NOT_FOUND = 'La fotografía no existe o fue eliminada';
const OFFERING_NOT_FOUND = 'Esta reunión no tiene una ofrenda registrada';
const LOCKED_MESSAGE =
  'Esta reunión está bloqueada porque la semana ya cerró. Solicite a su Pastor de Distrito que la reabra.';

/** `Meeting` with everything a report response needs resolved. */
const REPORT_INCLUDE = {
  meetingSchedule: {
    select: { peaceHouseId: true, peaceHouse: { select: { name: true } } },
  },
  theme: { select: { id: true, title: true, series: true } },
  offering: true,
  photos: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.MeetingInclude;

type MeetingWithReport = Prisma.MeetingGetPayload<{ include: typeof REPORT_INCLUDE }>;

/**
 * Registro de la reunión — tema, predicador, observaciones, ofrenda y
 * fotografías (doc01 RF-022..RF-026, doc02 RN-039..RN-044).
 *
 * ONE MEETING, ONE LOCK.
 * Whether any of this may still be edited is decided by
 * `AttendanceLockService`, the very same service the attendance sheet asks.
 * Writing a second calendar rule here would work on the day it was written
 * and drift afterwards — and the church would end up with a meeting whose
 * attendance is closed while its offering is still open.
 *
 * Style/error-handling precedent: `AttendanceService`.
 */
@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: AttendanceLockService,
  ) {}

  async getReport(
    meetingId: string,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  /** Tema, predicador y observaciones (RF-022/RF-023/RF-024). */
  async updateReport(
    meetingId: string,
    dto: UpdateMeetingReportDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    if (dto.themeId) {
      await this.assertThemeExists(dto.themeId);
    }

    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        // `null` clears the theme, `undefined` leaves it alone — the
        // difference between "no lo dictó nadie" and "no lo tocaron".
        ...(dto.themeId !== undefined ? { themeId: dto.themeId } : {}),
        ...(dto.preacher !== undefined ? { preacher: dto.preacher.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  /**
   * Registra o corrige la ofrenda (RN-039: una sola por reunión).
   *
   * An upsert rather than create/update: from the leader's side there is
   * one offering that either has a value yet or does not, and the unique
   * `meetingId` guarantees the second concurrent write updates instead of
   * inserting a duplicate.
   */
  async upsertOffering(
    meetingId: string,
    dto: UpsertOfferingDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    const amount = new Prisma.Decimal(dto.amount);
    const notes = dto.notes?.trim() || null;

    await this.prisma.offering.upsert({
      where: { meetingId },
      create: { meetingId, amount, notes, registeredBy: actor.sub, createdBy: actor.sub },
      update: {
        amount,
        notes,
        // RESURRECTS A DELETED OFFERING.
        // `meetingId` is unique, so a soft-deleted row can never be
        // replaced by a new one — without clearing these, a Casa de Paz
        // that removed a mistaken offering could never register another,
        // and the API would answer 200 while the report kept showing none.
        deletedAt: null,
        deletedBy: null,
        registeredBy: actor.sub,
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  /**
   * Soft delete of the offering — for the case where one was registered by
   * mistake, not for "no hubo ofrenda" (that is simply never registering
   * one). The row survives because RN-042 wants every movement traceable.
   */
  async removeOffering(
    meetingId: string,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    if (!meeting.offering || meeting.offering.deletedAt) {
      throw new NotFoundException(OFFERING_NOT_FOUND);
    }

    await this.prisma.offering.update({
      where: { meetingId },
      data: { deletedAt: now, deletedBy: actor.sub, version: { increment: 1 } },
    });

    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  /** Añade una fotografía ya subida por `POST /files/upload` (RF-025). */
  async addPhoto(
    meetingId: string,
    dto: AddMeetingPhotoDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    // Appended at the end unless placed explicitly, so uploading in order
    // needs no bookkeeping from the caller.
    const sortOrder = dto.sortOrder ?? meeting.photos.length;

    await this.prisma.meetingPhoto.create({
      data: {
        meetingId,
        path: dto.path.trim(),
        caption: dto.caption?.trim() || null,
        sortOrder,
        uploadedBy: actor.sub,
        createdBy: actor.sub,
      },
    });

    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  /**
   * Pie de foto, orden y ocultamiento (RN-044).
   *
   * Hiding is NOT deleting: the record and the file stay, the gallery stops
   * showing it. `hidden: false` puts it back.
   */
  async updatePhoto(
    meetingId: string,
    photoId: string,
    dto: UpdateMeetingPhotoDto,
    actor: JwtPayload,
    now: Date = new Date(),
  ): Promise<MeetingReportResponseDto> {
    const meeting = await this.findMeetingOrThrow(meetingId);
    await this.assertEditable(meeting, actor, now);

    const photo = meeting.photos.find((candidate) => candidate.id === photoId);
    if (!photo) {
      throw new NotFoundException(PHOTO_NOT_FOUND);
    }

    await this.prisma.meetingPhoto.update({
      where: { id: photoId },
      data: {
        ...(dto.caption !== undefined ? { caption: dto.caption.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.hidden !== undefined
          ? dto.hidden
            ? { hiddenAt: now, hiddenBy: actor.sub }
            : { hiddenAt: null, hiddenBy: null }
          : {}),
        updatedBy: actor.sub,
        version: { increment: 1 },
      },
    });

    return this.buildReport(await this.findMeetingOrThrow(meetingId), actor, now);
  }

  private async buildReport(
    meeting: MeetingWithReport,
    actor: JwtPayload,
    now: Date,
  ): Promise<MeetingReportResponseDto> {
    const peaceHouseId = meeting.meetingSchedule.peaceHouseId;

    const [lock, presentCount, rosterCount] = await Promise.all([
      this.lockService.getLockState(meeting.id, meeting.meetingDate, actor, now),
      this.prisma.attendance.count({
        where: { meetingId: meeting.id, present: true, deletedAt: null },
      }),
      this.prisma.personPeaceHouseHistory.count({
        where: { peaceHouseId, endDate: null, deletedAt: null, person: { deletedAt: null } },
      }),
    ]);

    return {
      meetingId: meeting.id,
      peaceHouseId,
      peaceHouseName: meeting.meetingSchedule.peaceHouse.name,
      meetingDate: meeting.meetingDate,
      isoYear: meeting.isoYear,
      isoWeek: meeting.isoWeek,
      status: meeting.status,
      themeId: meeting.theme?.id ?? null,
      themeTitle: meeting.theme?.title ?? null,
      themeSeries: meeting.theme?.series ?? null,
      preacher: meeting.preacher,
      notes: meeting.notes,
      offering:
        meeting.offering && !meeting.offering.deletedAt
          ? MeetingsService.toOfferingResponse(meeting.offering)
          : null,
      photos: meeting.photos.map((photo) => MeetingsService.toPhotoResponse(photo)),
      lock,
      presentCount,
      rosterCount,
    };
  }

  private async assertEditable(
    meeting: { id: string; meetingDate: Date },
    actor: JwtPayload,
    now: Date,
  ): Promise<void> {
    const state = await this.lockService.getLockState(meeting.id, meeting.meetingDate, actor, now);
    if (!state.editable) {
      throw new ForbiddenException(LOCKED_MESSAGE);
    }
  }

  private async assertThemeExists(themeId: string): Promise<void> {
    const theme = await this.prisma.sermonTheme.findFirst({
      where: { id: themeId, deletedAt: null },
      select: { id: true },
    });

    if (!theme) {
      throw new BadRequestException(THEME_NOT_FOUND);
    }
  }

  private async findMeetingOrThrow(meetingId: string): Promise<MeetingWithReport> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
      include: REPORT_INCLUDE,
    });

    if (!meeting) {
      throw new NotFoundException(MEETING_NOT_FOUND);
    }

    return meeting;
  }

  /**
   * `Decimal` to `number`. Safe for COP by a wide margin: the column tops
   * out at 999.999.999.999,99 and JavaScript loses precision above
   * 9.007.199.254.740.991 — four orders of magnitude apart.
   */
  static toOfferingResponse(offering: Offering): OfferingResponseDto {
    return {
      id: offering.id,
      meetingId: offering.meetingId,
      amount: offering.amount.toNumber(),
      currency: offering.currency,
      notes: offering.notes,
      registeredBy: offering.registeredBy,
      version: offering.version,
      createdAt: offering.createdAt,
      updatedAt: offering.updatedAt,
    };
  }

  static toPhotoResponse(photo: MeetingPhoto): MeetingPhotoResponseDto {
    return {
      id: photo.id,
      path: photo.path,
      caption: photo.caption,
      sortOrder: photo.sortOrder,
      hidden: photo.hiddenAt !== null,
      createdAt: photo.createdAt,
      version: photo.version,
    };
  }
}
