import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfigService } from '../config/app-config.service';

/**
 * Prisma ORM v7 requires `PrismaClient` to be constructed with an
 * explicit driver adapter — the classic "pass a connection string and
 * let the built-in engine connect" flow was removed. `DATABASE_URL`
 * remains the single source of truth for the connection string; it just
 * flows through `@prisma/adapter-pg` (node-postgres) now instead of an
 * implicit engine.
 *
 * Registered as a global module (see `prisma.module.ts`) so any future
 * business module can inject `PrismaService` without re-importing it.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: AppConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.databaseUrl,
        // node-postgres defaults to 0 (wait forever). Against an
        // unreachable host that drops packets rather than refusing them,
        // that hangs bootstrap indefinitely with no error and no log —
        // this bounds it so the app fails loudly instead.
        connectionTimeoutMillis: 10_000,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
