import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_METADATA_KEY, type AuditMetadata } from './audit.decorator';
import type { RequestWithUser } from '../security/guards/jwt-auth.guard';

/**
 * Optional base interceptor future business modules can enable
 * per-route with `@Audit(entity, action)`. Not applied globally and not
 * connected to any real action yet (per this phase's scope) — it exists
 * so a future module only needs to add the decorator, not re-implement
 * audit wiring.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata | undefined>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return next.handle().pipe(
      tap((result) => {
        const entityId = this.resolveEntityId(result, request);
        this.auditService
          .record({
            entity: metadata.entity,
            action: metadata.action,
            entityId,
            userId: request.user?.sub ?? null,
            ip: request.ip ?? null,
          })
          .catch(() => {
            // Audit logging must never break the actual request. A future
            // phase may want a dedicated failure alert; for now the write
            // itself already goes through the app's Pino logger for
            // Prisma-level error visibility.
          });
      }),
    );
  }

  private resolveEntityId(result: unknown, request: RequestWithUser): string {
    if (
      typeof result === 'object' &&
      result !== null &&
      'id' in result &&
      typeof (result as Record<string, unknown>).id === 'string'
    ) {
      return (result as Record<string, unknown>).id as string;
    }
    const paramId = request.params?.id;
    if (typeof paramId === 'string') {
      return paramId;
    }
    // Falls back to the acting user's own id — covers self-referential
    // actions where the audited entity IS the authenticated actor (e.g.
    // Auth module's LOGIN/LOGOUT, where the entity is the LeadershipUnit
    // that just authenticated, not something identified by a route param
    // or present in the response body's top-level `id`).
    return request.user?.sub ?? 'unknown';
  }
}
