import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../common/config/app-config.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeographyModule } from '../modules/geography/geography.module';
import { GeographyGeocoder } from '../modules/geography/application/geography.geocoder';

/**
 * Installation-time entry point for the map's coordinates:
 *
 *   pnpm db:geocode:geo
 *
 * RUN IT ONCE, AFTER `pnpm db:seed:geo`. It walks every department and
 * municipality that still has no position and asks the geocoder for one.
 *
 * IT TAKES ABOUT HALF AN HOUR and that is not a defect: Nominatim allows
 * one request per second and blocks callers who ignore that, so ~1.100
 * municipalities simply cost ~1.100 seconds. Leave it running.
 *
 * SAFE TO RE-RUN AND SAFE TO INTERRUPT. It only selects rows with null
 * coordinates, so stopping it halfway and starting again resumes exactly
 * where it left off. Rows the provider could not place stay null and are
 * retried on the next run.
 *
 * WHY A SCRIPT AND NOT A REQUEST
 * The running API has no code path to any geocoder — `GeographyModule`
 * does not export the port. A throttled third-party service can therefore
 * never delay a page a user is waiting on, and cannot get the installation
 * blocked during a busy afternoon.
 */

/**
 * Deliberately NOT `AppModule`, mirroring `seed-geography.ts`: this needs
 * configuration, Prisma and geography, and nothing else. Booting the whole
 * application would drag in Redis and every other module, so the installer
 * would fail for reasons unrelated to geocoding.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, GeographyModule],
})
class GeocodeGeographyModule {}

async function main(): Promise<void> {
  const logger = new Logger('GeocodeGeography');
  const app = await NestFactory.createApplicationContext(GeocodeGeographyModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    // `strict: false` searches the whole container: `GeographyGeocoder` is
    // intentionally not exported (see `geography.module.ts`), because an
    // operator script is the only legitimate caller.
    const geocoder = app.get(GeographyGeocoder, { strict: false });
    const result = await geocoder.run();

    if (result.pending === 0) {
      logger.log('Nothing to do — every department and municipality already has coordinates.');
      return;
    }

    logger.log(
      `Done. ${result.located} of ${result.pending} row(s) located via "${result.geocoder}".`,
    );

    if (result.unresolved > 0) {
      // A warning and not an error: unlocated rows are an ordinary outcome
      // (a renamed municipality, a name OSM spells differently), the map
      // simply omits them, and re-running picks them up.
      logger.warn(
        `${result.unresolved} row(s) could not be located and keep null coordinates. ` +
          'They will not appear on the map. Re-run this script to retry just those.',
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  new Logger('GeocodeGeography').error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
