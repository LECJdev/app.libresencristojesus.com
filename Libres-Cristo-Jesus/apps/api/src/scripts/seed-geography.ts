import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../common/config/app-config.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeographyModule } from '../modules/geography/geography.module';
import { ColombiaSeeder } from '../modules/geography/application/colombia.seeder';

/**
 * Installation-time entry point for the geographic catalogs:
 *
 *   pnpm db:seed:geo
 *
 * WHY A SCRIPT AND NOT `OnModuleInit`
 * The requirement is that the system keeps working even if the upstream
 * source disappears. The strongest possible guarantee of that is for the
 * running API to have no code path to it at all — so the fetch happens
 * here, once, by an operator, and never during boot. A dead host then
 * cannot delay a restart, fail a health check, or take down a deployment.
 *
 * Safe to re-run: `ColombiaSeeder` refuses to write when the catalogs
 * already hold rows.
 */

/**
 * Deliberately NOT `AppModule`: seeding needs configuration, Prisma and
 * the geography module, and nothing else. Booting the full application
 * would drag in Redis and every other module, making the installer fail
 * for reasons that have nothing to do with seeding.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, GeographyModule],
})
class GeographySeedModule {}

async function main(): Promise<void> {
  const logger = new Logger('SeedGeography');
  const app = await NestFactory.createApplicationContext(GeographySeedModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    // `strict: false` searches the whole container: `ColombiaSeeder` is
    // intentionally not exported by `GeographyModule` (see its comment),
    // because an operator script is the only legitimate caller.
    const seeder = app.get(ColombiaSeeder, { strict: false });
    const result = await seeder.run();

    logger.log(
      result.skipped
        ? `Nothing to do — catalogs already hold ${result.departments} departments and ${result.municipalities} municipalities.`
        : `Done. ${result.departments} departments and ${result.municipalities} municipalities seeded from "${result.source}".`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // A failed seed must exit non-zero: an installer that reports success
  // while leaving the catalogs empty is worse than one that stops.
  new Logger('SeedGeography').error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
