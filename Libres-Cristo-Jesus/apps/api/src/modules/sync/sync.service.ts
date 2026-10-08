import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type SyncOperationStatus as PrismaSyncStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { SyncOperationStatus } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { AttendanceService } from '../attendance/attendance.service';
import { MarkAllDto, MarkAttendanceDto } from '../attendance/dto/attendance.dto';
import { MeetingsService } from '../meetings/meetings.service';
import {
  AddMeetingPhotoDto,
  UpdateMeetingReportDto,
  UpsertOfferingDto,
} from '../meetings/dto/meeting-report.dto';
import { PeopleService } from '../people/people.service';
import { CreatePersonDto } from '../people/dto/create-person.dto';
import type { SyncBatchDto, SyncOperationDto, SyncBatchResultDto } from './dto/sync.dto';

/**
 * Aplica las operaciones creadas sin conexión (Fase 10, RN-1202/RN-1203).
 *
 * ── LA IDEA CENTRAL: no hay lógica de negocio nueva aquí ─────────────
 * Este servicio NO reimplementa qué es marcar asistencia ni cómo se valida
 * una ofrenda. Llama a `AttendanceService`, `PeopleService` y
 * `MeetingsService` — los mismos que atienden al usuario conectado — y su
 * único aporte es el CUÁNDO: les pasa `createdOfflineAt` como su `now`.
 *
 * Eso hace que la Regla 3 salga gratis y que la Regla 9 (no duplicar
 * lógica) se cumpla por construcción. Si mañana cambia una regla de
 * asistencia, cambia en un solo lugar y la sincronización la hereda. Una
 * segunda implementación "para offline" habría empezado idéntica y habría
 * divergido en la primera corrección que alguien olvidara replicar.
 *
 * Esto es posible porque desde la Fase 7 todo método de escritura acepta
 * `now: Date = new Date()`. Se hizo para poder ubicar un test en un límite
 * de semana sin esperar al domingo; resultó ser exactamente la costura que
 * esta fase necesitaba.
 *
 * ── Orden cronológico (Regla 2) ──────────────────────────────────────
 * El lote se ordena por `createdOfflineAt` antes de ejecutarse, y se aplica
 * en serie. En paralelo, dos marcas sobre la misma persona podrían llegar en
 * cualquier orden y la última en escribir ganaría — que no es "la última que
 * el líder hizo".
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly peopleService: PeopleService,
    private readonly meetingsService: MeetingsService,
  ) {}

  async processBatch(batch: SyncBatchDto, actor: JwtPayload): Promise<SyncBatchResultDto> {
    // Regla 2: orden cronológico real, no el orden en que el cliente las metió
    // en el arreglo.
    const ordered = [...batch.operations].sort(
      (a, b) => Date.parse(a.createdOfflineAt) - Date.parse(b.createdOfflineAt),
    );

    const results: SyncBatchResultDto['results'] = [];

    for (const operation of ordered) {
      results.push(await this.processOne(operation, actor));
    }

    return {
      results,
      applied: results.filter((r) => r.status === 'APPLIED').length,
      duplicated: results.filter((r) => r.status === 'DUPLICATE').length,
      rejected: results.filter((r) => r.status === 'REJECTED').length,
      conflicted: results.filter((r) => r.status === 'CONFLICT').length,
    };
  }

  private async processOne(
    operation: SyncOperationDto,
    actor: JwtPayload,
  ): Promise<SyncBatchResultDto['results'][number]> {
    /*
     * Regla 5 — idempotencia. Se consulta ANTES de tocar el dominio: un
     * dispositivo que perdió la respuesta reenvía la cola entera, y sin esto
     * cada reintento duplicaría fotos y observaciones.
     *
     * Se devuelve el resultado ORIGINAL, no un "ya estaba": si la primera vez
     * fue rechazada por semana cerrada, el reintento tiene que decir lo mismo.
     */
    const known = await this.prisma.syncOperation.findUnique({
      where: { operationId: operation.operationId },
      select: { status: true, resultMessage: true },
    });

    if (known) {
      return {
        operationId: operation.operationId,
        status: 'DUPLICATE',
        message: known.resultMessage ?? 'La operación ya había sido sincronizada.',
      };
    }

    const createdOfflineAt = new Date(operation.createdOfflineAt);

    try {
      const outcome = await this.apply(operation, actor, createdOfflineAt);
      await this.record(operation, actor, createdOfflineAt, outcome.status, outcome.message);
      return { operationId: operation.operationId, ...outcome };
    } catch (error) {
      /*
       * Regla 4 — el rechazo se PERSISTE como resultado final, no se propaga
       * como fallo del lote. Una operación fuera del período no se reintenta:
       * volver a mandarla daría el mismo rechazo para siempre, y el resto de
       * la cola —que sí es válida— quedaría atrapada detrás de ella.
       */
      const message = describeRejection(error);
      await this.record(operation, actor, createdOfflineAt, 'REJECTED', message);
      this.logger.warn(
        `Operación ${operation.operationId} (${operation.operationType}) rechazada: ${message}`,
      );
      return { operationId: operation.operationId, status: 'REJECTED', message };
    }
  }

  /** Despacha al servicio de dominio que corresponde. */
  private async apply(
    operation: SyncOperationDto,
    actor: JwtPayload,
    createdOfflineAt: Date,
  ): Promise<{ status: SyncOperationStatus; message: string }> {
    const { operationType, payload, meetingId } = operation;

    switch (operationType) {
      case 'ATTENDANCE_MARK': {
        const { personId, ...rest } = payload as { personId?: string };
        const dto = await toDto(MarkAttendanceDto, rest);
        await this.attendanceService.markAttendance(
          requireMeetingId(meetingId),
          requireString(personId, 'personId'),
          dto,
          actor,
          createdOfflineAt,
        );
        // Regla 6 — asistencia: se conserva la unión. Marcar es idempotente
        // por (reunión, persona), así que aplicar todas las operaciones
        // válidas produce exactamente esa unión sin lógica extra.
        return { status: 'APPLIED', message: 'Asistencia registrada.' };
      }

      case 'ATTENDANCE_MARK_ALL': {
        const dto = await toDto(MarkAllDto, payload);
        await this.attendanceService.markAll(
          requireMeetingId(meetingId),
          dto,
          actor,
          createdOfflineAt,
        );
        return { status: 'APPLIED', message: 'Asistencia de toda la lista registrada.' };
      }

      case 'PERSON_CREATE': {
        const dto = await toDto(CreatePersonDto, payload);
        await this.peopleService.create(dto, actor);
        return { status: 'APPLIED', message: 'Persona registrada.' };
      }

      case 'MEETING_REPORT':
        return this.applyReport(requireMeetingId(meetingId), payload, actor, createdOfflineAt);

      case 'OFFERING_UPSERT':
        return this.applyOffering(requireMeetingId(meetingId), payload, actor, createdOfflineAt);

      case 'MEETING_PHOTO_ADD': {
        const dto = await toDto(AddMeetingPhotoDto, payload);
        await this.meetingsService.addPhoto(
          requireMeetingId(meetingId),
          dto,
          actor,
          createdOfflineAt,
        );
        // Regla 6 — fotografías: se agregan todas las válidas.
        return { status: 'APPLIED', message: 'Fotografía agregada.' };
      }

      default: {
        // El DTO ya restringe el conjunto; esto atrapa un tipo nuevo que
        // alguien añada al contrato y olvide implementar acá.
        const exhaustive: never = operationType;
        throw new Error(`Tipo de operación no soportado: ${String(exhaustive)}`);
      }
    }
  }

  /**
   * Regla 6 — prédica: SE CONSERVA LA PRIMERA REGISTRADA.
   *
   * Si la reunión ya tiene tema o predicador y esta operación traería otros,
   * no se sobrescribe: se aplica solo lo que estaba vacío y el intento queda
   * auditado. Dos teléfonos de la misma pareja de líderes registrando la
   * predicación desde la reunión es el caso normal, no el raro.
   *
   * Las observaciones NO compiten: se conservan todas mediante auditoría, así
   * que una nota que llega después no borra la anterior — se concatena.
   */
  private async applyReport(
    meetingId: string,
    payload: Record<string, unknown>,
    actor: JwtPayload,
    createdOfflineAt: Date,
  ): Promise<{ status: SyncOperationStatus; message: string }> {
    const dto = await toDto(UpdateMeetingReportDto, payload);

    const current = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { themeId: true, preacher: true, notes: true },
    });

    const themeTaken = Boolean(current?.themeId) && Boolean(dto.themeId);
    const preacherTaken = Boolean(current?.preacher) && Boolean(dto.preacher);

    const effective: UpdateMeetingReportDto = {
      ...(themeTaken ? {} : { themeId: dto.themeId }),
      ...(preacherTaken ? {} : { preacher: dto.preacher }),
      // Se anexa en vez de reemplazar: "conservar todas mediante auditoría".
      ...(dto.notes ? { notes: appendNote(current?.notes ?? null, dto.notes) } : {}),
    };

    await this.meetingsService.updateReport(meetingId, effective, actor, createdOfflineAt);

    if (themeTaken || preacherTaken) {
      return {
        status: 'APPLIED',
        message:
          'Registro aplicado. La predicación ya estaba registrada, se conservó la primera y su versión quedó en la auditoría.',
      };
    }

    return { status: 'APPLIED', message: 'Registro de la reunión aplicado.' };
  }

  /**
   * Regla 6 — ofrenda: NUNCA se sobrescribe automáticamente.
   *
   * Si ya hay una ofrenda registrada con un monto distinto, la operación
   * queda en CONFLICT y espera que una persona decida. Es la única regla de
   * resolución que no se puede automatizar, y con razón: dos montos distintos
   * para la misma reunión significan que alguien contó mal o que hubo dos
   * conteos, y el sistema no tiene forma de saber cuál es el bueno. Elegir
   * uno solo por ser el último en llegar sería inventar una respuesta sobre
   * el dinero de la iglesia.
   */
  private async applyOffering(
    meetingId: string,
    payload: Record<string, unknown>,
    actor: JwtPayload,
    createdOfflineAt: Date,
  ): Promise<{ status: SyncOperationStatus; message: string }> {
    const dto = await toDto(UpsertOfferingDto, payload);

    const existing = await this.prisma.offering.findFirst({
      where: { meetingId, deletedAt: null },
      select: { amount: true },
    });

    if (existing && !existing.amount.equals(new Prisma.Decimal(dto.amount))) {
      return {
        status: 'CONFLICT',
        message:
          `La reunión ya tiene una ofrenda registrada por ${existing.amount.toString()} y esta operación trae ${dto.amount}. ` +
          'No se sobrescribió: verifique cuál es el valor correcto y regístrelo desde la pantalla de la reunión.',
      };
    }

    await this.meetingsService.upsertOffering(meetingId, dto, actor, createdOfflineAt);
    return { status: 'APPLIED', message: 'Ofrenda registrada.' };
  }

  /**
   * Regla 7 — toda sincronización queda trazada.
   *
   * La fila de `SyncOperation` ES la auditoría de la sincronización: guarda
   * usuario, dispositivo, fecha real de creación, fecha de llegada, tipo,
   * reunión afectada, resultado y el payload completo. La auditoría de la
   * ESCRITURA en sí la produce cada servicio de dominio a través de
   * `AuditInterceptor`, como en cualquier otra petición — otra consecuencia
   * de reutilizarlos en vez de reimplementarlos.
   */
  private async record(
    operation: SyncOperationDto,
    actor: JwtPayload,
    createdOfflineAt: Date,
    status: SyncOperationStatus,
    message: string,
  ): Promise<void> {
    // `DUPLICATE` nunca llega hasta acá: se resuelve antes de aplicar.
    const persisted: PrismaSyncStatus =
      status === 'CONFLICT' ? 'CONFLICT' : status === 'REJECTED' ? 'REJECTED' : 'APPLIED';

    try {
      await this.prisma.syncOperation.create({
        data: {
          operationId: operation.operationId,
          meetingId: operation.meetingId ?? null,
          userId: actor.sub,
          deviceId: operation.deviceId,
          createdOfflineAt,
          operationType: operation.operationType,
          payload: operation.payload as Prisma.InputJsonValue,
          status: persisted,
          resultMessage: message,
        },
      });
    } catch (error) {
      /*
       * Dos envíos simultáneos de la misma cola pueden pasar juntos por la
       * comprobación de idempotencia y chocar aquí en el índice único. El
       * dominio ya se aplicó una sola vez (las escrituras son idempotentes o
       * quedaron serializadas), así que la carrera se absorbe: registrar dos
       * veces la misma operación es el único daño posible, y es el que evita
       * la restricción.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(
          `Carrera al registrar ${operation.operationId}: ya existía. Se ignora el duplicado.`,
        );
        return;
      }
      throw error;
    }
  }
}

/**
 * Valida el payload con el MISMO DTO que usa la ruta en línea.
 *
 * Un payload creado sin conexión no pasó por el `ValidationPipe` global —
 * llegó anidado dentro de otro cuerpo. Sin esto, la única capa de validación
 * del producto se saltearía justamente para los datos que estuvieron días en
 * un teléfono.
 */
async function toDto<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<T> {
  const instance = plainToInstance(cls, payload, { enableImplicitConversion: true });
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const detail = errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ');
    throw new Error(`Datos inválidos en la operación: ${detail}`);
  }

  return instance;
}

function requireMeetingId(meetingId: string | undefined): string {
  if (!meetingId) {
    throw new Error('La operación requiere meetingId.');
  }
  return meetingId;
}

function requireString(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`La operación requiere ${field}.`);
  }
  return value;
}

/**
 * Anexa una observación conservando la anterior (Regla 6).
 *
 * Un separador visible en vez de un simple salto de línea: quien lea la ficha
 * meses después tiene que poder ver que fueron dos anotaciones distintas y no
 * un párrafo que alguien escribió de corrido.
 */
function appendNote(previous: string | null, incoming: string): string {
  const trimmed = incoming.trim();
  if (!previous) {
    return trimmed;
  }
  if (previous.includes(trimmed)) {
    // Reenvío de una operación cuyo registro no se alcanzó a persistir: no
    // duplica el texto.
    return previous;
  }
  return `${previous}\n---\n${trimmed}`;
}

/** Mensaje mostrable a partir de lo que lanzó el servicio de dominio. */
function describeRejection(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: unknown }).response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join('; ');
      }
    }
  }

  return error instanceof Error ? error.message : 'No fue posible aplicar la operación.';
}
