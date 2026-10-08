import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditEntryInput {
  entity: string;
  entityId: string;
  action: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  userId?: string | null;
  ip?: string | null;
}

/**
 * Writes to the immutable `AuditLog` table (`Documentos/04`, section 8).
 * Not wired to any real action yet — no business module exists this
 * phase — but it's fully functional and covered by an integration test
 * (`audit.service.spec.ts`) that inserts a real row against the
 * dockerized Postgres.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue ?? undefined,
        newValue: input.newValue ?? undefined,
        userId: input.userId ?? undefined,
        ip: input.ip ?? undefined,
      },
    });
  }
}
