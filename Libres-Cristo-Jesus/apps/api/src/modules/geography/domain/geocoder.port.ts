/**
 * A resolved position. `number` here and `Decimal` in the database: this is
 * the boundary where a provider's JSON arrives, and Prisma performs the
 * conversion when persisting.
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * A place to be located, described the way a gazetteer expects it.
 *
 * `department` travels alongside `name` because Colombian municipality
 * names are NOT unique: there is a Santa Rosa in half a dozen departments,
 * and a query without the department resolves to whichever one the
 * provider ranks first — silently placing a Casa de Paz hundreds of
 * kilometres from where it meets.
 */
export interface GeocodeQuery {
  name: string;
  department?: string;
}

/**
 * PORT — the boundary between "how a place name becomes coordinates" and
 * everything else.
 *
 * WHY THIS IS A SEPARATE PORT AND NOT PART OF `GeographySource`
 * The two answer different questions. `GeographySource` answers "which
 * municipalities exist", and a DIVIPOLA CSV — the documented fallback for
 * when api-colombia.com disappears — answers it perfectly while carrying no
 * coordinates whatsoever. Folding geocoding into that interface would force
 * every future adapter to invent positions it does not have, which is how a
 * fallback stops being a viable fallback.
 *
 * Enrichment is therefore optional and independent: the catalogue is usable
 * without it, and the map is the only feature that degrades when it has not
 * been run.
 *
 * LIKE `GeographySource`, THIS IS INSTALLATION-TIME ONLY. The running
 * application never geocodes: it reads the coordinates already stored. A
 * provider that is slow, rate-limited or gone must never be able to affect
 * a request a user is waiting on.
 */
export interface Geocoder {
  /** Stable identifier for logs and provenance, e.g. `"nominatim"`. */
  readonly name: string;

  /**
   * Resolves one place, or `null` when the provider has no confident match.
   *
   * `null` rather than a throw: an unlocatable municipality is an ordinary
   * outcome of a run over a thousand rows, not a failure of the run. The
   * caller records it and moves on, and a later pass can retry just those.
   */
  geocode(query: GeocodeQuery): Promise<GeoCoordinates | null>;
}

/** DI token — an `interface` does not survive compilation to JavaScript. */
export const GEOCODER = Symbol('GEOCODER');
