/**
 * Role catalog shared between backend (Guards/decorators) and, later,
 * frontend (role-conditional UI). Backed by the `CatRole` Prisma model —
 * see `Documentos/04-modelo-de-datos.md` section 4 and
 * `Documentos/05-roles-y-permisos.md`.
 *
 * `CatRole` itself is a simple catalog (id/name/description). Fine-grained
 * authorization is backed by the `Permission`/`RolePermission` tables added
 * in Phase 4 — a deliberate departure from doc04, approved by the project
 * owner, since doc04/doc05 only describe a conceptual permission matrix,
 * not a normalized schema. Role-only checks (`@Roles(...)`) still compare
 * against this enum; scope/permission checks read `RolePermission`.
 *
 * `RoleName` is an English enum for type-safe use in code (e.g.
 * `@Roles(RoleName.ADMIN)`), while `ROLE_NAME_LABELS` is the single
 * source of truth mapping each enum member to the exact Spanish string
 * seeded into `CatRole.name` (`prisma/seed.ts` and
 * `apps/api/src/common/security` both import this constant so the two
 * never drift apart).
 */
export enum RoleName {
  ADMIN = 'ADMIN',
  GENERAL_PASTOR = 'GENERAL_PASTOR',
  DISTRICT_PASTOR = 'DISTRICT_PASTOR',
  LEADER = 'LEADER',
  /**
   * Escuela Kids module (independent from Casas de Paz — see
   * `prisma/schema.prisma`'s "Escuela Kids" section). Scoped to a single
   * `KidsSchool` via `KidsUserAssignment`, not to a District/PeaceHouse.
   */
  KIDS_LEADER = 'KIDS_LEADER',
  KIDS_ASSISTANT = 'KIDS_ASSISTANT',
}

export const ROLE_NAME_LABELS: Record<RoleName, string> = {
  [RoleName.ADMIN]: 'Administrador',
  [RoleName.GENERAL_PASTOR]: 'Pastor General',
  [RoleName.DISTRICT_PASTOR]: 'Pastor Distrito',
  [RoleName.LEADER]: 'Líder',
  [RoleName.KIDS_LEADER]: 'Líder Escuela Kids',
  [RoleName.KIDS_ASSISTANT]: 'Auxiliar Escuela Kids',
};
