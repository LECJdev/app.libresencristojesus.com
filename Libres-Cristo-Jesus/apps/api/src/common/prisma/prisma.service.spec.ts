import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { AppConfigService } from '../config/app-config.service';

/**
 * Proves `PrismaService` compiles and resolves correctly through Nest's
 * DI container in a minimal test module (per this phase's brief — a
 * real endpoint using it isn't required yet). `.compile()` alone (no
 * `.init()`) never calls `onModuleInit()`, so this needs no live DB
 * connection — it only exercises construction/DI wiring, including the
 * Prisma v7 driver-adapter pattern (`@prisma/adapter-pg`).
 *
 * Deliberately does NOT assert `toBeInstanceOf(PrismaService)`: Prisma
 * Client's runtime returns an object whose `constructor` cosmetically
 * points back to the subclass (so `.constructor.name`/`.constructor`
 * equality checks are reliable) but whose actual prototype chain does
 * not include `PrismaService.prototype` — so `instanceof` against a
 * class extending `PrismaClient` is unreliable. Verified empirically
 * while writing this test; asserting on `.constructor` and on the
 * methods that must exist (lifecycle hook + a generated model delegate)
 * is the correct, reliable way to prove DI wiring here.
 */
describe('PrismaService (DI wiring)', () => {
  it('compiles and injects correctly in a minimal test module', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: AppConfigService,
          useValue: {
            databaseUrl: 'postgresql://lcj:change_me_dev_password@localhost:5432/lcj_connect',
          },
        },
      ],
    }).compile();

    const prismaService = moduleRef.get(PrismaService);

    expect(prismaService).toBeDefined();
    expect(prismaService.constructor).toBe(PrismaService);
    expect(typeof prismaService.onModuleInit).toBe('function');
    expect(typeof prismaService.onModuleDestroy).toBe('function');
    expect(typeof prismaService.catRole.findMany).toBe('function');

    await moduleRef.close();
  });
});
