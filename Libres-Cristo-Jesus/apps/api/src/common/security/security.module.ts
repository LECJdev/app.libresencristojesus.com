import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ScopeGuard } from './guards/scope.guard';

/**
 * `JwtModule.register({})` is intentional: it's registered with no
 * default secret/options because `TokenService` always passes an
 * explicit secret (`JWT_SECRET` or `JWT_REFRESH_SECRET`) and expiry per
 * call — there is no single "default" secret to configure here.
 *
 * Guards are exported (not wired globally here) — `CommonModule` applies
 * them globally via `APP_GUARD` tokens, which needs them resolvable as
 * ordinary providers from this (global) module. `ScopeGuard` also injects
 * `PrismaService`, resolvable here without importing `PrismaModule`
 * because it's `@Global()` too (same precedent as `AuditService`).
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TokenService, JwtAuthGuard, RolesGuard, ScopeGuard],
  exports: [TokenService, JwtAuthGuard, RolesGuard, ScopeGuard],
})
export class SecurityModule {}
