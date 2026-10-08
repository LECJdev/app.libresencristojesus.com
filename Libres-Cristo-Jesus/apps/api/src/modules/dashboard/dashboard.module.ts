import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Indicadores del Dashboard (Fase 9).
 *
 * Depends on nothing but Prisma: it reads the tables the other modules own
 * rather than calling their services. A dashboard that went through
 * `PeopleService`, `AttendanceService` and `OfferingsService` would inherit
 * their pagination, their DTO shapes and their per-row permission checks —
 * none of which an aggregate wants — and would couple the panel to every
 * module it summarises.
 *
 * `PrismaModule` is global, so nothing needs importing here.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
