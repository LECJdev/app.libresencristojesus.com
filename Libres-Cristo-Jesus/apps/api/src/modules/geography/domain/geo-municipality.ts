/**
 * A municipality as the domain understands it. See `GeoDepartment` for
 * why these types are source-agnostic.
 */
export interface GeoMunicipality {
  /** See `GeoDepartment.externalId`. */
  externalId: string;

  name: string;

  /** Official DANE code (5 digits), or `null` — see `GeoDepartment.codeDane`. */
  codeDane: string | null;

  /**
   * The `externalId` of the department this municipality belongs to —
   * NOT a database id.
   *
   * A source describes its own graph in its own identifiers; resolving
   * those to internal UUIDs is the seeder's job, because only the seeder
   * knows what was just persisted. Putting a UUID here would force every
   * source to query the database, which is exactly the coupling this
   * layer exists to prevent.
   */
  departmentExternalId: string;
}
