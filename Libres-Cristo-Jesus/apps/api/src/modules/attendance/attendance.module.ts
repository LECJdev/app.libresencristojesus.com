import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceLockService } from './attendance-lock.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * Asistencia semanal (doc11 RN-407/RN-503/RN-504).
 *
 * `AttendanceLockService` is exported: Fase 8 (Eventos y Ofrendas) edits
 * the same `Meeting` rows and must obey the identical calendar rule. One
 * implementation, or the two modules will disagree about what "locked"
 * means.
 *
 * `AttendanceService` is exported for Fase 10: `SyncModule` applies the
 * operations a Líder created offline by calling THIS service with
 * `createdOfflineAt` as its `now`. Exporting it is what keeps the offline
 * path from growing a second implementation of what "marcar asistencia"
 * means — the two would start identical and drift on the first correction
 * somebody forgot to replicate.
 *
 * `AuditModule` imported explicitly — not global.
 */
@Module({
  imports: [AuditModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceLockService],
  exports: [AttendanceLockService, AttendanceService],
})
export class AttendanceModule {}
