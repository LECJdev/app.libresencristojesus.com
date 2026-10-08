import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so
 * it's resolvable without re-importing — same precedent as `UsersModule`.
 * `AuditModule` IS imported explicitly (not global) because
 * `PermissionsController` uses its `AuditInterceptor` on every mutating
 * route — this module is the most sensitive security surface in the
 * system, so every create/update/delete/grant/revoke must be audited.
 */
@Module({
  imports: [AuditModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
