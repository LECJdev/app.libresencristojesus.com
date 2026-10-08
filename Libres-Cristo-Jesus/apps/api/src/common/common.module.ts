import { BadRequestException, Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ResponseWrapperInterceptor } from './interceptors/response-wrapper.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { JwtAuthGuard } from './security/guards/jwt-auth.guard';
import { RolesGuard } from './security/guards/roles.guard';
import { ScopeGuard } from './security/guards/scope.guard';
import { toApiErrorDetails } from './pipes/validation-error-mapper';

/**
 * Registers every cross-cutting concern (auth guards, the global exception
 * filter, interceptors, and the validation pipe) as `APP_*` DI tokens
 * instead of imperative `app.useGlobalX(...)` calls in `main.ts`.
 *
 * This is not just a style preference: guards/filters/interceptors/pipes
 * registered only inside `main.ts`'s `bootstrap()` are NOT active for a
 * standard NestJS `TestingModule` (`Test.createTestingModule({ imports:
 * [AppModule] })`) — that path never calls `bootstrap()`. A future e2e
 * test built that way would silently exercise every endpoint with no
 * auth/role check, no error-shape normalization, and no validation,
 * while looking like a real integration test. `APP_*` tokens are part of
 * the module graph, so they apply in every bootstrap path, `main.ts`
 * included.
 *
 * Order matters for the three `APP_GUARD` entries — NestJS applies multiple
 * `APP_GUARD` providers in registration order: `JwtAuthGuard` must run
 * before `RolesGuard`/`ScopeGuard` so `request.user` is populated first,
 * and `ScopeGuard` runs last so it only does its (DB-backed) permission
 * and scope checks once the role itself has already been allowed through.
 * Like `RolesGuard`, `ScopeGuard` is a no-op for any route with no
 * `@RequirePermission(...)` metadata, so registering it globally is safe
 * for every route that doesn't opt in yet (no business module does, this
 * phase — see `apps/api/src/common/security/guards/scope.guard.ts`).
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseWrapperInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (validationErrors: ValidationError[]) =>
          new BadRequestException(toApiErrorDetails(validationErrors)),
      }),
    },
  ],
})
export class CommonModule {}
