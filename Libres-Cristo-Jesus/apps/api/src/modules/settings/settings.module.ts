import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * System configuration (doc04 "Mejoras" §3).
 *
 * `AuditModule` must be imported explicitly — it is NOT global, and
 * `SettingsController` applies `AuditInterceptor` to its write routes
 * (doc06 §20 audits configuration changes). Omitting it does not fail a
 * typecheck, a lint or a build: Nest only discovers the missing
 * `AuditService` dependency while instantiating the module at boot, and
 * the whole application refuses to start. Same precedent as
 * `DistrictsModule`.
 *
 * `PrismaService` needs no import: `PrismaModule` is `@Global()`.
 */
@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
