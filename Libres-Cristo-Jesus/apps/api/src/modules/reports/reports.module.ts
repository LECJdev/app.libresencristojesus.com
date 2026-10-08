import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Reportes consolidados y exportación a Excel (Fase 9).
 *
 * Like `DashboardModule`, it depends on nothing but Prisma: a report reads
 * the tables the other modules own instead of calling their services, which
 * would drag in their pagination, their DTOs and their per-row permission
 * checks — none of which a bulk read wants.
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
