import { Module } from '@nestjs/common';
import { PeaceHousesController } from './peace-houses.controller';
import { PeaceHousesService } from './peace-houses.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so it's
 * resolvable without re-importing — same precedent as `DistrictsModule`/
 * `OrganizationModule`. `AuditModule` IS imported explicitly (not global)
 * because `PeaceHousesController` uses its `AuditInterceptor` on every
 * create/update/delete route.
 */
@Module({
  imports: [AuditModule],
  controllers: [PeaceHousesController],
  providers: [PeaceHousesService],
})
export class PeaceHousesModule {}
