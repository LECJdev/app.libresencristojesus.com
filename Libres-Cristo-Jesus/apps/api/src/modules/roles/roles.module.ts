import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so
 * it's resolvable without re-importing — same precedent as `AuthModule`/
 * `UsersModule`. No `AuditModule` import: this module has no
 * create/update/delete routes, so no `@Audit(...)`/`AuditInterceptor` use.
 */
@Module({
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
