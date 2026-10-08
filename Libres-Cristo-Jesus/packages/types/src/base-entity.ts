/**
 * Common field convention for every "tabla principal" (main/business
 * table), per `Documentos/04-modelo-de-datos.md` sections 13
 * ("Eliminación Lógica") and 14 ("Campos Comunes").
 *
 * Prisma has no model inheritance, so this is expressed as a plain
 * TypeScript interface that future domain entities (District, PeaceHouse,
 * Person, Meeting, ...) can extend/intersect for consistent typing —
 * it does not affect the actual Prisma schema, which repeats these
 * fields explicitly per model.
 *
 * `TStatus` is generic because each domain entity defines its own status
 * enum (e.g. `LeadershipUnitStatus`); it defaults to `string` for
 * entities that haven't defined one yet.
 */
export interface BaseEntity<TStatus = string> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  status: TStatus;
  /** Optimistic locking counter — increment on every update. */
  version: number;
}
