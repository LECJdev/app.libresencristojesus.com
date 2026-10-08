import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * Registro de la reunión y Ofrendas (Fase 8).
 *
 * `AttendanceModule` is imported for ONE thing: `AttendanceLockService`.
 * The report, the offering and the photographs obey the same weekly lock
 * as the attendance sheet, and the only way to guarantee they never
 * disagree is to ask the same object. That module exports it precisely so
 * this one would not be tempted to write its own.
 *
 * `AuditModule` imported explicitly — not global. Forgetting it is what
 * once made a module pass all four static checks and refuse to boot.
 */
@Module({
  imports: [AttendanceModule, AuditModule],
  controllers: [MeetingsController, OfferingsController],
  providers: [MeetingsService, OfferingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
