import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GEOCODER, type Geocoder } from '../domain/geocoder.port';

export interface GeocodingResult {
  /** Rows that had no coordinates when the run started. */
  pending: number;
  /** Rows the provider located and this run persisted. */
  located: number;
  /** Rows the provider could not place; they keep their null coordinates. */
  unresolved: number;
  /** Provenance, e.g. `"nominatim"`. */
  geocoder: string;
}

/**
 * Fills in the coordinates the map needs, ONCE, at installation time.
 *
 * IDEMPOTENT AND RESUMABLE, by construction rather than by bookkeeping: it
 * only ever selects rows whose `latitude` is null, so re-running it after a
 * crash, a rate-limit block or a laptop closing at row 700 picks up exactly
 * where it stopped. There is no progress file to corrupt and no flag to get
 * out of step with reality — the absence of a coordinate IS the to-do list.
 *
 * Municipalities are geocoded with their department attached, because
 * Colombian municipality names repeat across departments (see
 * `GeocodeQuery`). Departments get a centroid too, so a map can frame a
 * region that has no Casas de Paz in it yet.
 *
 * WHY THIS NEVER RUNS DURING A REQUEST
 * Nominatim allows one call per second and blocks callers who exceed it.
 * Geocoding on demand would put a shared, throttled, third-party dependency
 * in the path of a user waiting for a page — and the first busy afternoon
 * would get the whole installation blocked.
 */
@Injectable()
export class GeographyGeocoder {
  private readonly logger = new Logger(GeographyGeocoder.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GEOCODER) private readonly geocoder: Geocoder,
  ) {}

  async run(): Promise<GeocodingResult> {
    const departments = await this.geocodeDepartments();
    const municipalities = await this.geocodeMunicipalities();

    return {
      pending: departments.pending + municipalities.pending,
      located: departments.located + municipalities.located,
      unresolved: departments.unresolved + municipalities.unresolved,
      geocoder: this.geocoder.name,
    };
  }

  private async geocodeDepartments(): Promise<Omit<GeocodingResult, 'geocoder'>> {
    const rows = await this.prisma.catDepartment.findMany({
      where: { latitude: null, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    this.logger.log(`${rows.length} department(s) without coordinates.`);
    let located = 0;

    for (const row of rows) {
      const coordinates = await this.geocoder.geocode({ name: row.name });
      if (!coordinates) {
        continue;
      }

      await this.prisma.catDepartment.update({
        where: { id: row.id },
        data: { latitude: coordinates.latitude, longitude: coordinates.longitude },
      });
      located += 1;
    }

    return { pending: rows.length, located, unresolved: rows.length - located };
  }

  private async geocodeMunicipalities(): Promise<Omit<GeocodingResult, 'geocoder'>> {
    const rows = await this.prisma.catMunicipality.findMany({
      where: { latitude: null, deletedAt: null },
      select: { id: true, name: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    this.logger.log(
      `${rows.length} municipality/ies without coordinates. At ~1.5 s each this run will take about ` +
        `${Math.ceil((rows.length * 1.5) / 60)} minute(s).`,
    );
    let located = 0;

    for (const [index, row] of rows.entries()) {
      const coordinates = await this.geocoder.geocode({
        name: row.name,
        department: row.department.name,
      });

      if (coordinates) {
        await this.prisma.catMunicipality.update({
          where: { id: row.id },
          data: { latitude: coordinates.latitude, longitude: coordinates.longitude },
        });
        located += 1;
      }

      // Progress matters on a run measured in tens of minutes: silence for
      // half an hour is indistinguishable from a hang, and an operator who
      // cannot tell the difference kills it.
      if ((index + 1) % 50 === 0) {
        this.logger.log(`  …${index + 1}/${rows.length} processed, ${located} located.`);
      }
    }

    return { pending: rows.length, located, unresolved: rows.length - located };
  }
}
