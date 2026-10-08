import { Module } from '@nestjs/common';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so it's
 * resolvable without re-importing — same precedent as `OrganizationModule`/
 * `UsersModule`. `AuditModule` IS imported explicitly (not global) because
 * `DistrictsController` uses its `AuditInterceptor` on every create/update/
 * delete route.
 */
@Module({
  imports: [AuditModule],
  controllers: [DistrictsController],
  providers: [DistrictsService],
})
export class DistrictsModule {}
