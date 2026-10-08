import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` is not imported here on purpose: it comes from the
 * `@Global()` `PrismaModule` (already imported once in `AppModule`), so
 * it's resolvable without re-importing — same precedent as `AuthModule`.
 * `AuditModule` IS imported explicitly (not global) because
 * `UsersController` uses its `AuditInterceptor` on create/update/
 * change-password/delete.
 */
@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
