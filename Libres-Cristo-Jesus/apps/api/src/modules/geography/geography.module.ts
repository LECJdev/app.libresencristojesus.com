import { Module } from '@nestjs/common';
import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { ColombiaSeeder } from './application/colombia.seeder';
import { GeographyGeocoder } from './application/geography.geocoder';
import { GEOGRAPHY_SOURCE } from './domain/geography-source.port';
import { GEOCODER } from './domain/geocoder.port';
import { ApiColombiaSource } from './infrastructure/api-colombia/api-colombia.source';
import { NominatimGeocoder } from './infrastructure/nominatim/nominatim.geocoder';

/**
 * THE COMPOSITION ROOT for geographic data.
 *
 * ── Swapping the source ──────────────────────────────────────────────
 * Everything about "where Colombia's departments and municipalities come
 * from" is decided by the single `useClass` line below. To move to a
 * DIVIPOLA CSV, a JSON fixture, or a different API:
 *
 *   1. Write a class implementing `GeographySource`
 *      (apps/api/src/modules/geography/domain/geography-source.port.ts).
 *   2. Change `useClass` here.
 *
 * No service, controller, DTO, entity or frontend screen changes. That is
 * the whole point of the port: the dependency points inward, so the
 * database and the domain never learn what the outside world looks like.
 *
 * ── Why the port is NOT exported ─────────────────────────────────────
 * `exports` lists only `GeographyService` — which reads PostgreSQL and
 * nothing else. `GEOGRAPHY_SOURCE` and `ApiColombiaSource` stay private to
 * this module, so no functional module *can* call an external API even by
 * mistake. The requirement "ningún módulo funcional deberá consultar la
 * API nuevamente" is therefore enforced by the module graph, not by a
 * convention someone has to remember.
 *
 * `ColombiaSeeder` is also unexported: the installation script reaches it
 * with `app.get(ColombiaSeeder, { strict: false })`, which is deliberate
 * friction — seeding is an operator action, never something application
 * code triggers.
 *
 * ── Why geocoding is a SECOND, separate port ─────────────────────────
 * `GEOGRAPHY_SOURCE` answers "which municipalities exist"; `GEOCODER`
 * answers "where is this one". They are split because the documented
 * fallback for the first (a DIVIPOLA CSV) answers it perfectly while
 * carrying no coordinates at all — merging them would force every future
 * adapter to invent positions, and a fallback that cannot be implemented
 * is not a fallback. The catalogue works without the enrichment; only the
 * map degrades when it has not been run.
 *
 * `GeographyGeocoder` is unexported for the same reason as `ColombiaSeeder`.
 */
@Module({
  controllers: [GeographyController],
  providers: [
    GeographyService,
    ColombiaSeeder,
    GeographyGeocoder,
    {
      provide: GEOGRAPHY_SOURCE,
      useClass: ApiColombiaSource,
    },
    {
      provide: GEOCODER,
      useClass: NominatimGeocoder,
    },
  ],
  exports: [GeographyService],
})
export class GeographyModule {}
