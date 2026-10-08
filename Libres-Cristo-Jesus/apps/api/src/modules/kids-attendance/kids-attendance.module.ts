import { Module } from '@nestjs/common';
import { KidsAttendanceController } from './kids-attendance.controller';
import { KidsAttendanceService } from './kids-attendance.service';
import { AuditModule } from '../../common/audit/audit.module';

/** Reuniones + asistencia semanal + métricas de sede — Fase 11, cuarta parte ("Escuela Kids"). */
@Module({
  imports: [AuditModule],
  controllers: [KidsAttendanceController],
  providers: [KidsAttendanceService],
})
export class KidsAttendanceModule {}
