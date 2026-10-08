import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so
 * it's resolvable without re-importing — same precedent as `UsersModule`/
 * `PermissionsModule`. `AuditModule` IS imported explicitly (not global)
 * because `OrganizationController` uses its `AuditInterceptor` on every
 * create/update/delete route.
 */
@Module({
  imports: [AuditModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
