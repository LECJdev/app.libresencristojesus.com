import { Injectable, Logger } from '@nestjs/common';
import { isWithinColombia } from '@lcj/types';
import type { GeoCoordinates, GeocodeQuery, Geocoder } from '../../domain/geocoder.port';

/** Provenance label, mirroring `ApiColombiaSource.name`. */
const GEOCODER_NAME = 'nominatim';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Nominatim's usage policy caps absolutely at 1 request per second, and
 * enforces it by blocking the caller. 1.5 s buys margin for clock drift and
 * for the request itself — a ~1.100-row catalogue therefore takes roughly
 * half an hour, which is fine for something run once by an operator and
 * never on the hot path.
 */
const MIN_INTERVAL_MS = 1_500;

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Identifies this application to Nominatim, as its policy REQUIRES. A
 * generic or absent User-Agent is grounds for being blocked outright.
 */
const USER_AGENT = 'LCJConnect/1.0 (gestion Casas de Paz; contacto: admin@libresencristojesus.org)';

/**
 * Colombia's ISO code, sent on every query. Without it "Santa Rosa" happily
 * resolves to Argentina.
 */
const COUNTRY_CODE = 'co';

/**
 * ADAPTER — the only class that knows coordinates can come from OpenStreetMap.
 *
 * It implements `Geocoder` and is bound to that port in
 * `geography.module.ts`. Swapping it for a DIVIPOLA centroid table or a
 * local gazetteer means writing a sibling class and changing one line.
 *
 * INSTALLATION-TIME ONLY, like `ApiColombiaSource`. Nothing in the request
 * path can reach it: `GeographyModule` does not export the port, so a
 * blocked or slow Nominatim can never surface as a slow page.
 */
@Injectable()
export class NominatimGeocoder implements Geocoder {
  readonly name = GEOCODER_NAME;

  private readonly logger = new Logger(NominatimGeocoder.name);

  /**
   * When the next request may be sent. Held on the instance rather than
   * being a caller's responsibility so the rate limit cannot be violated by
   * forgetting to sleep — every path through `geocode` waits.
   */
  private nextAllowedAt = 0;

  async geocode(query: GeocodeQuery): Promise<GeoCoordinates | null> {
    await this.respectRateLimit();

    const params = new URLSearchParams({
      city: query.name,
      country: COUNTRY_CODE,
      format: 'json',
      limit: '1',
    });
    if (query.department) {
      params.set('state', query.department);
    }

    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`HTTP ${response.status} geocoding "${describeQuery(query)}"`);
        return null;
      }

      return toCoordinates(await response.json());
    } catch (error) {
      // Swallowed to `null` on purpose: over a thousand rows, a handful of
      // timeouts is normal. Throwing would abort a run that is 90 % useful,
      // and the run is resumable precisely because unlocated rows keep
      // their null coordinates.
      this.logger.warn(
        `Failed to geocode "${describeQuery(query)}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const waitMs = this.nextAllowedAt - now;
    if (waitMs > 0) {
      await delay(waitMs);
    }
    this.nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
  }
}

/**
 * Reads the first hit, rejecting anything that is not a usable pair of
 * finite numbers inside Colombia.
 *
 * The bounds check is not paranoia: Nominatim answers a bad query with a
 * confident match somewhere else on Earth, and a coordinate in the Pacific
 * is indistinguishable from a correct one once it is a row in a table.
 *
 * `isWithinColombia` comes from `@lcj/types` so the map's viewport clamp and
 * this validation can never disagree about where the country is.
 */
function toCoordinates(payload: unknown): GeoCoordinates | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const first: unknown = payload[0];
  if (typeof first !== 'object' || first === null) {
    return null;
  }

  const { lat, lon } = first as { lat?: unknown; lon?: unknown };
  if (typeof lat !== 'string' || typeof lon !== 'string') {
    return null;
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return isWithinColombia(latitude, longitude) ? { latitude, longitude } : null;
}

function describeQuery(query: GeocodeQuery): string {
  return query.department ? `${query.name}, ${query.department}` : query.name;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
