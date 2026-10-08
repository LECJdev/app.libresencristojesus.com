import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../../../common/config/app-config.service';
import type { GeoDepartment } from '../../domain/geo-department';
import type { GeoMunicipality } from '../../domain/geo-municipality';
import type { GeographySource } from '../../domain/geography-source.port';
import { toGeoDepartment, toGeoMunicipality } from './api-colombia.mapper';
import { isApiColombiaCity, isApiColombiaDepartment } from './api-colombia.types';

/** Persisted as `sourceName`; changing it orphans previously seeded rows. */
const SOURCE_NAME = 'api-colombia';

/**
 * How many times a single request is attempted before giving up. The
 * seeder runs once at installation, so a transient network hiccup
 * shouldn't cost an operator a manual re-run — but retrying forever would
 * just hide a genuinely dead host.
 */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;

/**
 * ADAPTER — the only class in this codebase that knows the geographic
 * catalogs can come from an HTTP API.
 *
 * It implements `GeographySource` and is bound to that port in
 * `geography.module.ts`. Replacing it (DIVIPOLA CSV, JSON fixture, a
 * different API) means writing a sibling class and changing one line
 * there; nothing outside this folder mentions api-colombia.com.
 *
 * Used exclusively by `ColombiaSeeder` at installation time. The running
 * application never constructs it — `GeographyModule` does not export the
 * port — so this file's availability has no bearing on whether the system
 * works day to day.
 */
@Injectable()
export class ApiColombiaSource implements GeographySource {
  readonly name = SOURCE_NAME;

  private readonly logger = new Logger(ApiColombiaSource.name);

  constructor(private readonly config: AppConfigService) {}

  async fetchDepartments(): Promise<GeoDepartment[]> {
    const payload = await this.getJson('/Department');

    if (!Array.isArray(payload)) {
      throw new ServiceUnavailableException(
        'api-colombia returned a non-array payload for /Department',
      );
    }

    const departments = payload.filter(isApiColombiaDepartment).map(toGeoDepartment);

    // A partial catalog is worse than none: it would satisfy the seeder's
    // "tables are empty" guard and then never be retried, leaving the
    // system permanently missing departments nobody notices until a Casa
    // de Paz cannot be located.
    if (departments.length !== payload.length) {
      throw new ServiceUnavailableException(
        `api-colombia returned ${payload.length - departments.length} malformed department record(s)`,
      );
    }

    this.logger.log(`Fetched ${departments.length} departments from ${this.name}`);
    return departments;
  }

  async fetchMunicipalities(): Promise<GeoMunicipality[]> {
    const payload = await this.getJson('/City');

    if (!Array.isArray(payload)) {
      throw new ServiceUnavailableException('api-colombia returned a non-array payload for /City');
    }

    const municipalities = payload.filter(isApiColombiaCity).map(toGeoMunicipality);

    if (municipalities.length !== payload.length) {
      throw new ServiceUnavailableException(
        `api-colombia returned ${payload.length - municipalities.length} malformed city record(s)`,
      );
    }

    this.logger.log(`Fetched ${municipalities.length} municipalities from ${this.name}`);
    return municipalities;
  }

  /**
   * One GET, with a hard timeout and bounded retries.
   *
   * `AbortSignal.timeout` rather than an open-ended `fetch`: without it a
   * hung connection would stall the install indefinitely with no output.
   */
  private async getJson(path: string): Promise<unknown> {
    const url = `${this.config.colombiaApiUrl}${path}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.config.colombiaApiTimeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${MAX_ATTEMPTS} failed for GET ${url}: ${describeError(error)}`,
        );

        if (attempt < MAX_ATTEMPTS) {
          // Linear backoff is enough here: this is one operator running an
          // install, not a fleet of clients that could stampede the host.
          await delay(RETRY_BASE_DELAY_MS * attempt);
        }
      }
    }

    throw new ServiceUnavailableException(
      `Could not reach the geographic catalog source at ${url} after ${MAX_ATTEMPTS} attempts: ${describeError(lastError)}`,
    );
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
