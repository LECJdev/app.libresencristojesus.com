import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService`/`TokenService` are not imported here on purpose: both
 * come from `@Global()` modules (`PrismaModule`/`SecurityModule`,
 * already imported once in `AppModule`), so they're resolvable without
 * re-importing — same precedent as `AuditService` itself. `AuditModule`
 * IS imported explicitly because it is NOT global — `AuthController`
 * uses its `AuditInterceptor` on the login/logout routes.
 *
 * No `JwtStrategy`/`PassportModule` here: `JwtAuthGuard`
 * (`apps/api/src/common/security/guards/jwt-auth.guard.ts`) already
 * implements Bearer token validation itself via `TokenService`, with no
 * Passport dependency at all. Adding Passport on top would be a second,
 * redundant authentication mechanism running in parallel — this module
 * only adds the login/refresh/logout/me business logic on top of the
 * guard that already exists.
 */
@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
