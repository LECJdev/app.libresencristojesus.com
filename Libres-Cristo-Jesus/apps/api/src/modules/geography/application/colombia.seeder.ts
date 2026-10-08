import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { GeoDepartment } from '../domain/geo-department';
import type { GeoMunicipality } from '../domain/geo-municipality';
import { GEOGRAPHY_SOURCE, type GeographySource } from '../domain/geography-source.port';

/**
 * Rows per `createMany` call. 1,123 municipalities would fit in one
 * statement, but chunking keeps the parameter count far from Postgres'
 * 65,535 bind-parameter ceiling — which a future source with more columns
 * or more rows could otherwise hit as a baffling runtime error.
 */
const INSERT_CHUNK_SIZE = 500;

/**
 * Interactive-transaction budget. Prisma's default is 5 s, which is not
 * enough for ~1,150 inserts on a cold database, and blowing it would roll
 * back a seed that was otherwise working fine.
 */
const TRANSACTION_TIMEOUT_MS = 120_000;
const TRANSACTION_MAX_WAIT_MS = 15_000;

export interface ColombiaSeedResult {
  /** True when the catalogs were already populated and nothing was written. */
  skipped: boolean;
  source: string;
  departments: number;
  municipalities: number;
}

/**
 * Populates `CatDepartment` / `CatMunicipality` at installation time.
 *
 * WHAT THIS CLASS DELIBERATELY DOES NOT KNOW
 * Where the data comes from. It depends on the `GeographySource` port,
 * never on a concrete implementation — `geography.module.ts` decides
 * which one is bound. Swapping api-colombia.com for a DIVIPOLA CSV
 * changes nothing in this file.
 *
 * WHEN IT RUNS
 * Only from the explicit `pnpm db:seed:geo` command, never on application
 * boot. That is what makes "the system keeps working even if the API
 * disappears" true by construction rather than by hope: the running API
 * has no code path that reaches an external source at all.
 *
 * SAFETY
 * - Refuses to run if either catalog already holds rows, so re-running the
 *   installer is harmless.
 * - Fetches everything BEFORE opening the transaction. Waiting on a remote
 *   host while holding database locks is how a slow third party turns into
 *   a database incident.
 * - Writes both catalogs in one transaction: a half-seeded catalog would
 *   satisfy the "already populated" guard above and never be retried.
 */
@Injectable()
export class ColombiaSeeder {
  private readonly logger = new Logger(ColombiaSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GEOGRAPHY_SOURCE) private readonly source: GeographySource,
  ) {}

  async run(): Promise<ColombiaSeedResult> {
    const [existingDepartments, existingMunicipalities] = await Promise.all([
      this.prisma.catDepartment.count(),
      this.prisma.catMunicipality.count(),
    ]);

    if (existingDepartments > 0 || existingMunicipalities > 0) {
      this.logger.log(
        `Geographic catalogs already populated (${existingDepartments} departments, ` +
          `${existingMunicipalities} municipalities) — skipping.`,
      );
      return {
        skipped: true,
        source: this.source.name,
        departments: existingDepartments,
        municipalities: existingMunicipalities,
      };
    }

    this.logger.log(`Seeding geographic catalogs from "${this.source.name}"…`);

    const [departments, municipalities] = await Promise.all([
      this.source.fetchDepartments(),
      this.source.fetchMunicipalities(),
    ]);

    assertReferentialIntegrity(departments, municipalities);

    const written = await this.prisma.$transaction(
      async (tx) => {
        await tx.catDepartment.createMany({
          data: departments.map((department) => ({
            sourceName: this.source.name,
            externalId: department.externalId,
            codeDane: department.codeDane,
            name: department.name,
          })),
        });

        // `createMany` does not return the inserted rows, so the
        // externalId -> UUID map has to be read back. This is the single
        // point where a source's own identifiers are translated into the
        // internal keys the rest of the system uses.
        const persisted = await tx.catDepartment.findMany({
          where: { sourceName: this.source.name },
          select: { id: true, externalId: true },
        });
        const idByExternalId = new Map(persisted.map((row) => [row.externalId, row.id]));

        const rows = municipalities.map((municipality) => {
          const departmentId = idByExternalId.get(municipality.departmentExternalId);
          if (!departmentId) {
            // Unreachable: `assertReferentialIntegrity` already proved every
            // parent exists. Kept so a future refactor that drops that check
            // fails here instead of writing an orphan.
            throw new Error(
              `Municipality "${municipality.name}" references unknown department ` +
                `externalId "${municipality.departmentExternalId}"`,
            );
          }
          return {
            departmentId,
            sourceName: this.source.name,
            externalId: municipality.externalId,
            codeDane: municipality.codeDane,
            name: municipality.name,
          };
        });

        for (const chunk of chunked(rows, INSERT_CHUNK_SIZE)) {
          await tx.catMunicipality.createMany({ data: chunk });
        }

        return { departments: departments.length, municipalities: rows.length };
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS },
    );

    this.logger.log(
      `Seeded ${written.departments} departments and ${written.municipalities} municipalities ` +
        `from "${this.source.name}".`,
    );

    return { skipped: false, source: this.source.name, ...written };
  }
}

/**
 * Proves every municipality's parent is present, and that no source
 * duplicated an `externalId` — both would otherwise surface as an opaque
 * constraint violation mid-transaction, long after the useful context is
 * gone.
 */
function assertReferentialIntegrity(
  departments: readonly GeoDepartment[],
  municipalities: readonly GeoMunicipality[],
): void {
  if (departments.length === 0) {
    throw new Error('The geographic source returned no departments — refusing to seed.');
  }

  const departmentIds = new Set(departments.map((department) => department.externalId));
  if (departmentIds.size !== departments.length) {
    throw new Error('The geographic source returned duplicate department externalIds.');
  }

  const municipalityIds = new Set(municipalities.map((municipality) => municipality.externalId));
  if (municipalityIds.size !== municipalities.length) {
    throw new Error('The geographic source returned duplicate municipality externalIds.');
  }

  const orphans = municipalities.filter(
    (municipality) => !departmentIds.has(municipality.departmentExternalId),
  );
  if (orphans.length > 0) {
    const sample = orphans
      .slice(0, 5)
      .map((orphan) => `${orphan.name} (department ${orphan.departmentExternalId})`)
      .join(', ');
    throw new Error(
      `${orphans.length} municipalit${orphans.length === 1 ? 'y' : 'ies'} reference a department ` +
        `the source did not return: ${sample}`,
    );
  }
}

function* chunked<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let index = 0; index < items.length; index += size) {
    yield items.slice(index, index + size);
  }
}
