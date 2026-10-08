import { SetMetadata } from '@nestjs/common';

export interface AuditMetadata {
  entity: string;
  action: string;
}

export const AUDIT_METADATA_KEY = 'audit_metadata';

/**
 * Marks a handler for automatic audit logging, e.g.
 * `@Audit('District', 'CREATE')`. Read by `AuditInterceptor`, which
 * calls `AuditService.record(...)` after the handler succeeds. Not used
 * by any real endpoint yet — future business modules opt in per-route.
 */
export const Audit = (entity: string, action: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUDIT_METADATA_KEY, { entity, action } satisfies AuditMetadata);
