import type { GeoDepartment } from './geo-department';
import type { GeoMunicipality } from './geo-municipality';

/**
 * PORT — the boundary between "where Colombia's geography comes from" and
 * everything else in this system.
 *
 * Only one collaborator is ever allowed to depend on this interface: the
 * seeder (`application/colombia.seeder.ts`), which runs at installation
 * time. Once the catalogs are populated, the running application reads
 * PostgreSQL and nothing else — `GeographyModule` does not export any
 * implementation of this port, so no functional module can reach an
 * external source even by accident.
 *
 * Swapping api-colombia.com for a DIVIPOLA CSV, a JSON fixture, or a
 * different API means writing one new class that implements this
 * interface and changing the `useClass` in `geography.module.ts`. Nothing
 * else in the codebase has to know.
 */
export interface GeographySource {
  /**
   * Stable identifier persisted as `CatDepartment.sourceName` /
   * `CatMunicipality.sourceName`, e.g. `"api-colombia"`.
   *
   * It scopes the `(sourceName, externalId)` unique constraint, so rows
   * written by a future provider can coexist with these instead of
   * colliding on an id that means something different.
   */
  readonly name: string;

  /** Every department the source knows about. */
  fetchDepartments(): Promise<GeoDepartment[]>;

  /**
   * Every municipality the source knows about, each carrying the
   * `externalId` of its department so the seeder can wire the relation.
   */
  fetchMunicipalities(): Promise<GeoMunicipality[]>;
}

/**
 * DI token. An `interface` does not survive compilation to JavaScript, so
 * Nest cannot inject by type here — a symbol is what makes
 * `@Inject(GEOGRAPHY_SOURCE)` resolvable at runtime.
 */
export const GEOGRAPHY_SOURCE = Symbol('GEOGRAPHY_SOURCE');
