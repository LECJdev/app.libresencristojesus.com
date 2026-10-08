/**
 * A department as the *domain* understands it — not as any particular
 * source publishes it.
 *
 * This type is the contract every `GeographySource` implementation must
 * produce. It deliberately knows nothing about HTTP, CSV, Prisma or
 * api-colombia.com: that is what makes the source swappable.
 */
export interface GeoDepartment {
  /**
   * The source's own identifier for this department, normalised to a
   * string. Used ONLY to reconcile a re-sync with rows already stored
   * (`@@unique([sourceName, externalId])`) — never as a foreign key, and
   * never comparable across two different sources.
   */
  externalId: string;

  name: string;

  /**
   * Official DANE code (2 digits), or `null` when the source does not
   * publish one. api-colombia.com does not — hence nullable. A future
   * DIVIPOLA-backed source fills this in without any other layer
   * changing.
   */
  codeDane: string | null;
}
