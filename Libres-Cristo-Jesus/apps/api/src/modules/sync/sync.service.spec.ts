import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import { SyncService } from './sync.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { AttendanceService } from '../attendance/attendance.service';
import type { MeetingsService } from '../meetings/meetings.service';
import type { PeopleService } from '../people/people.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { SyncBatchDto } from './dto/sync.dto';

/**
 * LO QUE ESTOS TESTS PROTEGEN, EN ORDEN DE IMPORTANCIA
 *
 * 1. REGLA 3 — el bloqueo se evalúa contra `createdOfflineAt`. Es la razón
 *    de ser de todo el módulo: sin ella, un líder que trabajó el domingo sin
 *    señal pierde su trabajo por sincronizar el lunes.
 * 2. REGLA 5 — idempotencia. Un reenvío no puede duplicar una foto ni una
 *    observación, y tiene que devolver el resultado ORIGINAL.
 * 3. REGLA 6 — la ofrenda nunca se sobrescribe sola. Es dinero de la
 *    iglesia; elegir un monto por ser el último en llegar sería inventar.
 * 4. REGLA 9 — no hay lógica de negocio duplicada: se verifica que se llame
 *    a los servicios de dominio y con qué `now`.
 */
describe('SyncService', () => {
  const leader: JwtPayload = {
    sub: 'leader-1',
    memberId: 'member-leader-1',
    username: 'lider',
    role: RoleName.LEADER,
  };

  /** Domingo 20:00 UTC: la reunión de la semana ISO en curso. */
  const SUNDAY_EVENING = '2026-07-26T20:00:00.000Z';
  /** Lunes 09:00: la semana ya cerró, pero la operación es del domingo. */
  const MONDAY_MORNING = '2026-07-27T09:00:00.000Z';

  type Mock = jest.Mock<Promise<unknown>, unknown[]>;
  const fn = (): Mock => jest.fn<Promise<unknown>, unknown[]>();

  let prisma: {
    syncOperation: { findUnique: Mock; create: Mock };
    meeting: { findUnique: Mock };
    offering: { findFirst: Mock };
  };
  let attendance: { markAttendance: Mock; markAll: Mock };
  let people: { create: Mock };
  let meetings: { updateReport: Mock; upsertOffering: Mock; addPhoto: Mock };
  let service: SyncService;

  const operation = (over: Partial<SyncBatchDto['operations'][number]> = {}) => ({
    operationId: over.operationId ?? '11111111-1111-4111-8111-111111111111',
    meetingId: 'meeting-1',
    deviceId: 'device-abc',
    createdOfflineAt: SUNDAY_EVENING,
    operationType: 'ATTENDANCE_MARK' as const,
    payload: { personId: 'person-1', present: true },
    ...over,
  });

  beforeEach(() => {
    prisma = {
      syncOperation: {
        findUnique: fn().mockResolvedValue(null),
        create: fn().mockResolvedValue({}),
      },
      meeting: {
        findUnique: fn().mockResolvedValue({ themeId: null, preacher: null, notes: null }),
      },
      offering: { findFirst: fn().mockResolvedValue(null) },
    };
    attendance = {
      markAttendance: fn().mockResolvedValue({}),
      markAll: fn().mockResolvedValue({}),
    };
    people = { create: fn().mockResolvedValue({}) };
    meetings = {
      updateReport: fn().mockResolvedValue({}),
      upsertOffering: fn().mockResolvedValue({}),
      addPhoto: fn().mockResolvedValue({}),
    };

    service = new SyncService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
      people as unknown as PeopleService,
      meetings as unknown as MeetingsService,
    );
  });

  describe('Regla 3 — el bloqueo usa createdOfflineAt, nunca la llegada', () => {
    it('pasa createdOfflineAt como el `now` del servicio de dominio', async () => {
      await service.processBatch({ operations: [operation()] }, leader);

      const args = attendance.markAttendance.mock.calls[0] as unknown[];
      expect(args[4]).toEqual(new Date(SUNDAY_EVENING));
    });

    it('NO usa la fecha de sincronización aunque sea de otra semana', async () => {
      // El escenario textual de la regla: creada el domingo, sincronizada el
      // lunes. Lo que el dominio debe recibir es el DOMINGO.
      await service.processBatch({ operations: [operation()] }, leader);

      const args = attendance.markAttendance.mock.calls[0] as unknown[];
      const passedNow = args[4] as Date;
      expect(passedNow.toISOString()).toBe(SUNDAY_EVENING);
      expect(passedNow.toISOString()).not.toBe(MONDAY_MORNING);
    });

    it('aplica la operación del domingo aunque el dominio la acepte por esa fecha', async () => {
      const result = await service.processBatch({ operations: [operation()] }, leader);

      expect(result.applied).toBe(1);
      expect(result.results[0]?.status).toBe('APPLIED');
    });
  });

  describe('Regla 4 — fuera del período permitido se rechaza', () => {
    it('registra REJECTED con el mensaje del dominio, sin romper el lote', async () => {
      attendance.markAttendance.mockRejectedValue(
        new ForbiddenException('La semana de esta reunión ya está cerrada.'),
      );

      const result = await service.processBatch({ operations: [operation()] }, leader);

      expect(result.rejected).toBe(1);
      expect(result.results[0]?.message).toContain('cerrada');
    });

    it('persiste el rechazo, para que un reintento no lo vuelva a ejecutar', async () => {
      attendance.markAttendance.mockRejectedValue(new ForbiddenException('Semana cerrada.'));

      await service.processBatch({ operations: [operation()] }, leader);

      const created = prisma.syncOperation.create.mock.calls[0]?.[0] as {
        data: { status: string };
      };
      expect(created.data.status).toBe('REJECTED');
    });

    it('un rechazo no impide que el resto del lote se aplique', async () => {
      attendance.markAttendance
        .mockRejectedValueOnce(new ForbiddenException('Semana cerrada.'))
        .mockResolvedValueOnce({});

      const result = await service.processBatch(
        {
          operations: [
            operation({ operationId: '11111111-1111-4111-8111-111111111111' }),
            operation({
              operationId: '22222222-2222-4222-8222-222222222222',
              createdOfflineAt: '2026-07-26T20:05:00.000Z',
            }),
          ],
        },
        leader,
      );

      expect(result.rejected).toBe(1);
      expect(result.applied).toBe(1);
    });
  });

  describe('Regla 5 — idempotencia', () => {
    it('no vuelve a ejecutar una operación ya sincronizada', async () => {
      prisma.syncOperation.findUnique.mockResolvedValue({
        status: 'APPLIED',
        resultMessage: 'Asistencia registrada.',
      });

      const result = await service.processBatch({ operations: [operation()] }, leader);

      expect(attendance.markAttendance).not.toHaveBeenCalled();
      expect(result.duplicated).toBe(1);
    });

    it('devuelve el resultado ORIGINAL, no un genérico', async () => {
      prisma.syncOperation.findUnique.mockResolvedValue({
        status: 'REJECTED',
        resultMessage: 'La semana de esta reunión ya está cerrada.',
      });

      const result = await service.processBatch({ operations: [operation()] }, leader);

      expect(result.results[0]?.message).toContain('cerrada');
    });

    it('absorbe la carrera de dos envíos simultáneos sin propagar el error', async () => {
      prisma.syncOperation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.processBatch({ operations: [operation()] }, leader);

      expect(result.applied).toBe(1);
    });
  });

  describe('Regla 2 — orden cronológico', () => {
    it('aplica en orden de createdOfflineAt, no en el del arreglo', async () => {
      await service.processBatch(
        {
          operations: [
            operation({
              operationId: '33333333-3333-4333-8333-333333333333',
              createdOfflineAt: '2026-07-26T21:00:00.000Z',
              payload: { personId: 'tarde', present: true },
            }),
            operation({
              operationId: '44444444-4444-4444-8444-444444444444',
              createdOfflineAt: '2026-07-26T19:00:00.000Z',
              payload: { personId: 'temprano', present: true },
            }),
          ],
        },
        leader,
      );

      const first = attendance.markAttendance.mock.calls[0] as unknown[];
      const second = attendance.markAttendance.mock.calls[1] as unknown[];
      expect(first[1]).toBe('temprano');
      expect(second[1]).toBe('tarde');
    });
  });

  describe('Regla 6 — resolución de conflictos', () => {
    it('OFRENDA: nunca sobrescribe un monto distinto; deja CONFLICT', async () => {
      prisma.offering.findFirst.mockResolvedValue({ amount: new Prisma.Decimal('250000') });

      const result = await service.processBatch(
        {
          operations: [
            operation({ operationType: 'OFFERING_UPSERT', payload: { amount: 180000 } }),
          ],
        },
        leader,
      );

      expect(meetings.upsertOffering).not.toHaveBeenCalled();
      expect(result.conflicted).toBe(1);
      expect(result.results[0]?.message).toContain('250000');
      expect(result.results[0]?.message).toContain('180000');
    });

    it('OFRENDA: aplica cuando el monto coincide — es el mismo dato, no un conflicto', async () => {
      prisma.offering.findFirst.mockResolvedValue({ amount: new Prisma.Decimal('250000') });

      const result = await service.processBatch(
        {
          operations: [
            operation({ operationType: 'OFFERING_UPSERT', payload: { amount: 250000 } }),
          ],
        },
        leader,
      );

      expect(meetings.upsertOffering).toHaveBeenCalled();
      expect(result.applied).toBe(1);
    });

    it('OFRENDA: aplica cuando no había ninguna registrada', async () => {
      const result = await service.processBatch(
        {
          operations: [operation({ operationType: 'OFFERING_UPSERT', payload: { amount: 99000 } })],
        },
        leader,
      );

      expect(result.applied).toBe(1);
    });

    it('PRÉDICA: conserva la primera registrada y no la pisa', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        themeId: 'tema-existente',
        preacher: 'Pastor Primero',
        notes: null,
      });

      const result = await service.processBatch(
        {
          operations: [
            operation({
              operationType: 'MEETING_REPORT',
              payload: { preacher: 'Pastor Segundo' },
            }),
          ],
        },
        leader,
      );

      const dto = meetings.updateReport.mock.calls[0]?.[1] as { preacher?: string };
      expect(dto.preacher).toBeUndefined();
      expect(result.results[0]?.message).toContain('se conservó la primera');
    });

    it('PRÉDICA: sí registra el predicador cuando el campo estaba vacío', async () => {
      const result = await service.processBatch(
        {
          operations: [
            operation({ operationType: 'MEETING_REPORT', payload: { preacher: 'Pastor Único' } }),
          ],
        },
        leader,
      );

      const dto = meetings.updateReport.mock.calls[0]?.[1] as { preacher?: string };
      expect(dto.preacher).toBe('Pastor Único');
      expect(result.applied).toBe(1);
    });

    it('OBSERVACIONES: conserva las anteriores en vez de reemplazarlas', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        themeId: null,
        preacher: null,
        notes: 'Primera observación.',
      });

      await service.processBatch(
        {
          operations: [
            operation({
              operationType: 'MEETING_REPORT',
              payload: { notes: 'Segunda observación.' },
            }),
          ],
        },
        leader,
      );

      const dto = meetings.updateReport.mock.calls[0]?.[1] as { notes?: string };
      expect(dto.notes).toContain('Primera observación.');
      expect(dto.notes).toContain('Segunda observación.');
    });

    it('OBSERVACIONES: no duplica el texto si la misma operación se reprocesa', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        themeId: null,
        preacher: null,
        notes: 'Ya estaba anotada.',
      });

      await service.processBatch(
        {
          operations: [
            operation({
              operationType: 'MEETING_REPORT',
              payload: { notes: 'Ya estaba anotada.' },
            }),
          ],
        },
        leader,
      );

      const dto = meetings.updateReport.mock.calls[0]?.[1] as { notes?: string };
      expect(dto.notes).toBe('Ya estaba anotada.');
    });

    it('FOTOGRAFÍAS: se agregan todas, sin competir entre sí', async () => {
      const result = await service.processBatch(
        {
          operations: [
            operation({
              operationId: '55555555-5555-4555-8555-555555555555',
              operationType: 'MEETING_PHOTO_ADD',
              payload: { path: 'meeting-photo/a.jpg' },
            }),
            operation({
              operationId: '66666666-6666-4666-8666-666666666666',
              operationType: 'MEETING_PHOTO_ADD',
              createdOfflineAt: '2026-07-26T20:10:00.000Z',
              payload: { path: 'meeting-photo/b.jpg' },
            }),
          ],
        },
        leader,
      );

      expect(meetings.addPhoto).toHaveBeenCalledTimes(2);
      expect(result.applied).toBe(2);
    });
  });

  describe('Regla 7 — trazabilidad', () => {
    it('registra usuario, dispositivo, fecha real y payload completo', async () => {
      await service.processBatch({ operations: [operation()] }, leader);

      const created = prisma.syncOperation.create.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(created.data).toMatchObject({
        operationId: '11111111-1111-4111-8111-111111111111',
        userId: 'leader-1',
        deviceId: 'device-abc',
        createdOfflineAt: new Date(SUNDAY_EVENING),
        operationType: 'ATTENDANCE_MARK',
        meetingId: 'meeting-1',
      });
      expect(created.data.payload).toEqual({ personId: 'person-1', present: true });
    });
  });

  describe('validación del payload', () => {
    it('rechaza un payload que no pasa el MISMO DTO de la ruta en línea', async () => {
      const result = await service.processBatch(
        {
          operations: [
            // `amount` negativo: RN-041 lo prohíbe y el DTO lo valida.
            operation({ operationType: 'OFFERING_UPSERT', payload: { amount: -5 } }),
          ],
        },
        leader,
      );

      expect(result.rejected).toBe(1);
      expect(meetings.upsertOffering).not.toHaveBeenCalled();
    });

    it('rechaza una operación de asistencia sin meetingId', async () => {
      const result = await service.processBatch(
        { operations: [operation({ meetingId: undefined })] },
        leader,
      );

      expect(result.rejected).toBe(1);
      expect(result.results[0]?.message).toContain('meetingId');
    });
  });

  describe('crear persona sin conexión', () => {
    it('usa PeopleService, sin reimplementar la creación', async () => {
      const result = await service.processBatch(
        {
          operations: [
            operation({
              operationType: 'PERSON_CREATE',
              meetingId: undefined,
              payload: { firstName: 'Ana', lastName: 'Torres' },
            }),
          ],
        },
        leader,
      );

      expect(people.create).toHaveBeenCalled();
      expect(result.applied).toBe(1);
    });
  });
});
