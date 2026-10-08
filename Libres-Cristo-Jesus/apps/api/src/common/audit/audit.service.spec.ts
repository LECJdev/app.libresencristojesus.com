import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { AppConfigService } from '../config/app-config.service';

/**
 * Integration test: exercises `AuditService` against the real dockerized
 * Postgres (see `docker-compose.yml`) with a real `PrismaService`, not a
 * mock — proving the write actually lands in `AuditLog`. Requires
 * `DATABASE_URL` to be exported in the shell (this repo intentionally
 * has no `.env` file yet); skipped gracefully otherwise so a plain
 * `pnpm test` without a DB available doesn't fail the whole suite.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('AuditService (integration)', () => {
  let prismaService: PrismaService;
  let auditService: AuditService;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL must be set to run this integration test.');
    }
    const configServiceStub = { databaseUrl: DATABASE_URL } as unknown as AppConfigService;
    prismaService = new PrismaService(configServiceStub);
    await prismaService.onModuleInit();
    auditService = new AuditService(prismaService);
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
  });

  it('inserts a real row into AuditLog via Prisma', async () => {
    const entityId = `test-entity-${Date.now()}`;

    await auditService.record({
      entity: 'TestEntity',
      action: 'CREATE',
      entityId,
      userId: null,
      ip: '127.0.0.1',
    });

    const rows = await prismaService.auditLog.findMany({ where: { entityId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entity: 'TestEntity',
      action: 'CREATE',
      entityId,
      ip: '127.0.0.1',
    });

    // Clean up so repeated runs stay idempotent for anyone inspecting the DB.
    await prismaService.auditLog.deleteMany({ where: { entityId } });
  });
});
