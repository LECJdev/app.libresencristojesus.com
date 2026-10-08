/**
 * Seeds the 4 initial `CatRole` rows (`Documentos/04-modelo-de-datos.md`
 * section 4) plus the `Permission`/`RolePermission` grants `ScopeGuard`
 * (`apps/api/src/common/security/guards/scope.guard.ts`) reads for the
 * Users, Roles and Permisos modules (`Documentos/05-roles-y-permisos.md`).
 * Idempotent
 * by design: `upsert` on unique keys (`CatRole.name`, `Permission`'s
 * `(resource, action)`, `RolePermission`'s `(roleId, permissionId)`)
 * means running this script any number of times never creates
 * duplicates. Run via `pnpm db:seed` (-> `prisma db seed`, configured in
 * `prisma.config.ts`).
 *
 * Imports `ROLE_NAME_LABELS` from `@lcj/types` instead of re-typing the
 * 4 Spanish role names here, so the seeded DB values and the
 * `RoleName`/`RolesGuard` code path can never drift apart.
 *
 * This script runs standalone (via `tsx`, outside Nest's DI container),
 * so it builds its own `PrismaClient` rather than reusing the app's
 * `PrismaService` — the standard Prisma seed-script pattern.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { ROLE_NAME_LABELS, RoleName } from '@lcj/types';

/**
 * Bootstrap administrator.
 *
 * WHY THIS EXISTS
 * Roles and permissions alone leave a database nobody can log into: every
 * endpoint is guarded, and creating the first user requires being
 * authenticated as someone who may create users — a deadlock a clean
 * install cannot break on its own.
 *
 * CREDENTIALS ARE DEVELOPMENT-ONLY. The password below is public
 * knowledge the moment it is committed, so it is intended for local and
 * demo environments and must be changed before any real deployment (see
 * `SEED_ADMIN_PASSWORD`). The seeder prints a warning to that effect.
 *
 * `SEED_ADMIN_PASSWORD` overrides it so a deployment can seed a real
 * secret without editing this file.
 */
const ADMIN_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'Admin123*';
const ADMIN_TYPE = 'Administrador';

/**
 * The single Church (doc06 module 1: "Debe existir una única Iglesia";
 * doc06 §2 names it "LIBRES EN CRISTO JESÚS").
 *
 * WHY THE SEEDER CREATES IT
 * `District.churchId` is required, so with no Church row nothing in the
 * organisational hierarchy can be created at all — and
 * `GET /organizations/tree` answers 404, which reads as a broken
 * installation rather than an empty one. It is the minimum relation a
 * usable install needs, not demo data.
 */
const CHURCH_NAME = 'Iglesia Cristiana Libres en Cristo Jesús';

/**
 * Hashing MUST match what the application does, or the seeded row would
 * store a value `AuthService` cannot verify and login would fail with
 * "invalid credentials" for a password that is, in fact, correct.
 * `apps/api/src/modules/users/users.service.ts` calls `argon2.hash(pwd)`
 * with library defaults (argon2id); this mirrors it exactly — no custom
 * options on either side.
 */
async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Administrador: 'Acceso total a la plataforma.',
  'Pastor General': 'Supervisión general de todos los distritos.',
  'Pastor Distrito': 'Supervisión de un distrito específico.',
  Líder: 'Liderazgo de una Casa de Paz.',
  'Líder Escuela Kids': 'Liderazgo administrativo de una sede de Escuela Kids.',
  'Auxiliar Escuela Kids': 'Apoyo operativo en una sede de Escuela Kids.',
};

/**
 * `(resource, action) -> roles`, doc05's per-role "Usuarios" capabilities:
 * - Administrador (Rol 1): "Crear/Editar cualquier usuario", "Eliminar
 *   lógicamente usuarios", "Cambiar contraseñas" -> every action.
 * - Pastor General (Rol 2): no explicit "editar/eliminar usuario" listed,
 *   only "No puede: Crear Administradores" (an update-time exclusion the
 *   *target role*, not the RolePermission grant, enforces — see
 *   `UsersService.assertCanAssignRole`) -> create/list/read only.
 * - Pastor Distrito (Rol 3): "Puede: Crear usuarios Líder" -> create
 *   (target-role-restricted the same way)/list/read only.
 * - Líder (Rol 4): "No puede: Crear usuarios" -> no grant at all.
 */
const USER_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'read', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'update', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
  { action: 'change-password', roles: [RoleName.ADMIN] },
];

/**
 * `(resource, action) -> roles` for the read-only `CatRole` ("Roles")
 * catalog module. doc05 never lists role-catalog CRUD as a capability of
 * any role — the only place `CatRole` is actually read from is the Users
 * module's `roleId` assignment (create/edit a `LeadershipUnit`), which
 * doc05 restricts to Administrador/Pastor General/Pastor Distrito (see
 * `USER_PERMISSIONS` above and `UsersService.assertCanAssignRole`). Líder
 * never creates/edits users, so it gets no grant here either — mirrors
 * `USER_PERMISSIONS`'s list/read roles exactly.
 */
const ROLE_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'read', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
];

/**
 * `(resource, action) -> roles` for the `permission`/`role-permission`
 * resources themselves (Fase 4's Permisos module). `Permission`/
 * `RolePermission` are not in doc04/doc05 at all — a deliberate
 * architecture decision by the project owner (see
 * `apps/api/src/modules/permissions/permissions.service.ts`). Since
 * doc05 keeps every security-configuration capability strictly
 * Administrador-only ("No puede: Modificar configuraciones técnicas del
 * sistema" / "Administrar auditoría" for every other role, vs.
 * Administrador's "Configurar la plataforma" / "Gestionar parámetros del
 * sistema"), managing the permission catalog and role grants — which
 * directly controls every other role's access — gets the same treatment:
 * granted to Administrador only, no exceptions.
 */
const PERMISSION_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN] },
  { action: 'read', roles: [RoleName.ADMIN] },
  { action: 'create', roles: [RoleName.ADMIN] },
  { action: 'update', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

const ROLE_PERMISSION_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN] },
  { action: 'create', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

/**
 * `(resource, action) -> roles` for the `church` resource (Fase 4's
 * Organización module — "Organización" in the business language of
 * `Documentos/06-modulo-organizacion.md` maps to the `Church` table, doc04
 * §4; there is no `Organization` table). Neither doc05 nor doc06 lists
 * creating/editing the Church row itself as a capability of any role — only
 * one Church exists today (see the comment above `District.number` in
 * `prisma/schema.prisma`) and doc06 section 19's API list never includes a
 * Church CRUD endpoint. The closest doc05 match is Rol 1's "Configurar la
 * plataforma"/"Gestionar parámetros del sistema", explicitly excluded from
 * Rol 2 ("No puede: Modificar configuraciones técnicas del sistema") — so
 * create/update/delete are Administrador-only here, same treatment as
 * `PERMISSION_PERMISSIONS` above. list/read are granted to every role: doc06
 * section 4 ("Todos los usuarios autenticados podrán consultar el
 * organigrama") and doc05's Matriz de Permisos ("Ver Organigrama" ✅ for all
 * four roles).
 */
const CHURCH_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'create', roles: [RoleName.ADMIN] },
  { action: 'update', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

/**
 * `(resource, action) -> roles` for the `district` resource (Fase 4's Distritos
 * module). Source: `Documentos/05-roles-y-permisos.md`'s Matriz de Permisos —
 * "Crear Distrito" and "Editar Distrito" are both ✅ only for Administrador and
 * Pastor General, ❌ for Pastor Distrito and Líder (Rol 3's own "No puede: Crear
 * Distritos" / "Modificar otros Distritos" and Rol 4's "No puede: Crear Distritos"
 * confirm the same restriction from the role-description side). There is no
 * "Eliminar Distrito" row in the matrix; doc06 §21 only grants Administrador "Todo"
 * and Pastores Generales "Administran toda la organización" over Districts —
 * nothing in doc05/doc06 grants Pastor Distrito or Líder the ability to remove a
 * whole District (their doc05 capabilities top out at Casas de Paz), so `delete`
 * gets the same Administrador/Pastor General-only grant as `create`/`update`.
 * `list`/`read` are granted to all four roles: the matrix's "Ver Organigrama" row
 * is ✅ for everyone, and doc06 §4 says "Todos los usuarios autenticados podrán
 * consultar el organigrama" — same reasoning `CHURCH_PERMISSIONS` above uses.
 */
const DISTRICT_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR] },
  { action: 'update', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR] },
  { action: 'delete', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR] },
];

/**
 * `(resource, action) -> roles` for the `peace-house` resource (Fase 4's Casas de Paz
 * module, the last business module of the phase). Source: `Documentos/05-roles-y-permisos.md`'s
 * Matriz de Permisos — "Crear Casa de Paz" and "Cerrar Casa de Paz" are both ✅ for
 * Administrador, Pastores Generales and Pastor Distrito, ❌ for Líder. There is no explicit
 * "Editar Casa de Paz" row in the matrix, but Rol 3's own narrative ("Puede: ... Editar Casas
 * de Paz.") grants it to Pastor Distrito, and Rol 1/Rol 2's blanket "acceso absoluto" /
 * "Administran toda la organización" extend it to Administrador/Pastor General too — so
 * `update` gets the same three-role grant as `create`/`delete`. Líder never gets a grant for
 * any of the three: its own "Puede" list (doc05 Rol 4) never includes editing/creating/closing
 * the Casa de Paz record itself, only Personas/Reuniones/Asistencia/Ofrendas/Fotos (out of
 * scope for this phase). `list`/`read` are granted to all four roles: the matrix's "Dashboard
 * Casa" row is ✅ for everyone, doc02 RN-045 says all users can view the organizational
 * structure, and Rol 4 itself lists "Consultar indicadores de su Casa de Paz" as a Líder
 * capability — same reasoning `DISTRICT_PERMISSIONS` above uses for its own list/read grant.
 */
const PEACE_HOUSE_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'update', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
  { action: 'delete', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
];

/**
 * Geographic catalogs (`CatDepartment`/`CatMunicipality`).
 *
 * Read-only for everyone, and readable by all four roles: these are
 * pick-lists any user filling in a Casa de Paz needs, and their contents
 * are public facts about Colombia — not church data that could be scoped.
 * There is no create/update/delete action at all: doc04 §3 defines these
 * as system-administered tables, written solely by `ColombiaSeeder`
 * (`pnpm db:seed:geo`), so granting a write permission would describe an
 * endpoint that deliberately does not exist.
 */
const GEOGRAPHY_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
];

/**
 * System configuration (doc04 "Mejoras" §3). `list`/`read` are open to all
 * four roles because settings drive product behaviour for everyone
 * (timezone, PWA parameters); `update`/`delete` are Administrador-only,
 * matching doc05's "Configurar Sistema" row (✅❌❌❌).
 */
const SETTING_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'update', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

/**
 * File upload/download. Every authenticated role may read a stored file
 * (photos appear on screens all four roles can open) and upload one:
 * doc06 §15 makes photographs part of ordinary leadership administration,
 * and a Líder registering their own Casa de Paz photo is exactly the flow
 * doc07 describes. `StorageService` still enforces type and size limits,
 * so the grant does not widen what can actually be stored.
 */
const FILE_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'create',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
];

/**
 * Pastoral process stages (doc04 §3 `CatPersonStage`).
 *
 * Seeded rather than hard-coded because the church may extend the path —
 * `sortOrder` exists so a new stage can be inserted between two existing
 * ones without renumbering anything the UI depends on.
 */
const PERSON_STAGES: { name: string; description: string; sortOrder: number }[] = [
  { name: 'Nuevo Visitante', description: 'Asiste por primera vez.', sortOrder: 1 },
  { name: 'Asistente Frecuente', description: 'Asiste con regularidad.', sortOrder: 2 },
  { name: 'En Consolidación', description: 'En proceso de acompañamiento pastoral.', sortOrder: 3 },
  { name: 'Miembro', description: 'Miembro formal de la iglesia.', sortOrder: 4 },
  { name: 'Servidor', description: 'Sirve activamente en un ministerio.', sortOrder: 5 },
  { name: 'Líder Potencial', description: 'Candidato a liderar una Casa de Paz.', sortOrder: 6 },
];

/**
 * Personas (doc04 §5). doc05 has no "Personas" row in its matrix, but Rol 4
 * lists registering and following up the attendees of their Casa de Paz as
 * a Líder capability — that is the module's entire purpose — while Roles
 * 1-3 supervise it. So all four roles create/list/read/update; `delete`
 * (a soft delete that removes someone from every roster) follows the same
 * three-role grant as `peace-house:delete`.
 */
const PERSON_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'create',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'update',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'delete', roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR] },
];

/**
 * Asistencia (doc05 Matriz de Permisos + doc11 RN-407).
 *
 * "Registrar Asistencia" is ✅ Administrador / ✅ Líder, ❌ Pastores
 * Generales / ❌ Pastor Distrito — so `register` goes to those two only.
 * `unlock` is the mirror image: RN-407 gives reopening to Administrador and
 * Pastor de Distrito, never to the Líder whose week it closes. `read` is
 * open to all four, because supervising requires seeing the sheet without
 * touching it.
 */
const ATTENDANCE_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'register', roles: [RoleName.ADMIN, RoleName.LEADER] },
  { action: 'unlock', roles: [RoleName.ADMIN, RoleName.DISTRICT_PASTOR] },
];

/**
 * Registro de la reunión — tema, predicador, observaciones y fotografías
 * (doc01 RF-022..RF-025, doc07 US-013/US-016).
 *
 * doc05's matrix row "Registrar Reunión" is ✅ Administrador / ✅ Líder and
 * ❌ for both pastor roles: the pastors supervise the report, they do not
 * fill it in. Same shape as `attendance:register`, which is the same act.
 *
 * `read` is open to all four for the same reason it is on attendance —
 * supervising means seeing the report without touching it.
 */
const MEETING_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'register', roles: [RoleName.ADMIN, RoleName.LEADER] },
];

/**
 * Ofrendas (doc02 RN-039..RN-042, doc07 US-017).
 *
 * doc05's "Registrar Ofrenda" row is ✅ Administrador / ✅ Líder only, while
 * Rol 2's own narrative grants Pastores Generales "Visualizar todas las
 * ofrendas" — so `read` goes to all four and `register` to two.
 */
const OFFERING_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'register', roles: [RoleName.ADMIN, RoleName.LEADER] },
];

/**
 * Catálogo de temas (doc04 §6 `SermonTheme`).
 *
 * `create`/`update` follow "Registrar Reunión" (Administrador + Líder): the
 * catalog only stays useful if whoever prepares the teaching can add a
 * theme the moment they need it. Requiring an administrator would push
 * every leader back to whatever free-text field they could find.
 *
 * `delete` is Administrador only — a theme is shared by every Casa de Paz
 * that used it, so removing one is never a local decision.
 */
/**
 * Dashboard (doc11 RN-1302, doc05 "Dashboard Casa" ✅✅✅✅).
 *
 * Read for all four roles. WHICH numbers each one gets is decided by scope
 * inside `DashboardService`, never by the permission: every role has a
 * dashboard, and they differ in what they cover, not in whether it opens.
 */
const DASHBOARD_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
];

/**
 * Reportes (doc05 "Exportar Excel" ✅✅✅✅).
 *
 * All four roles read AND export. What differs is the CONTENT: every report
 * definition starts from `peaceHouseScopeFilter`, so a Líder exporting
 * "Ofrendas" gets their own Casa de Paz. The permission opens the feature;
 * the scope decides the rows.
 */
const REPORT_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'export',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
];

/**
 * Sincronización offline (Fase 10, RN-1202/RN-1203).
 *
 * `push` para los cuatro roles. El permiso solo abre la puerta de la
 * sincronización; QUÉ puede aplicar cada quien lo sigue decidiendo el
 * servicio de dominio al que la operación termina llamando, con sus mismos
 * permisos y su mismo alcance por fila. Restringirlo aquí solo lograría que
 * un rol perdiera trabajo hecho sin conexión sin ganar ninguna seguridad.
 */
const SYNC_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'push',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
];

const SERMON_THEME_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  {
    action: 'list',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  {
    action: 'read',
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR, RoleName.LEADER],
  },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.LEADER] },
  { action: 'update', roles: [RoleName.ADMIN, RoleName.LEADER] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

// ---------------------------------------------------------------------
// Escuela Kids (Fase 11) — RN definitiva del dueño del proyecto: KIDS_LEADER
// y KIDS_ASSISTANT tienen acceso OPERATIVO idéntico sobre los niños de su
// propia sede (kids-child/kids-guardian/kids-consent/kids-attendance/
// kids-metrics). La diferencia entre ambos roles es puramente
// ADMINISTRATIVA — solo KIDS_LEADER administra la sede (kids-school:
// create/update/delete es ADMIN-only) y el equipo de auxiliares
// (kids-assignment). `delete` de kids-child sigue el mismo patrón que
// `person:delete` (PERSON_PERMISSIONS arriba): el rol operativo no lo
// tiene, solo el administrativo. Scope real (propia sede vs. todas) lo
// resuelve `ScopeGuard`/`ScopeResourceType.KIDS_SCHOOL`, no el permiso.
// ---------------------------------------------------------------------
const KIDS_SCHOOL_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'create', roles: [RoleName.ADMIN] },
  { action: 'update', roles: [RoleName.ADMIN] },
  { action: 'delete', roles: [RoleName.ADMIN] },
];

const KIDS_ASSIGNMENT_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER] },
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER] },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER] },
  { action: 'delete', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER] },
];

const KIDS_CHILD_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'list', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'update', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'delete', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER] },
];

const KIDS_GUARDIAN_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'create', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'update', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
];

const KIDS_CONSENT_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'upload', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
];

const KIDS_ATTENDANCE_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
  { action: 'mark', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
];

const KIDS_METRICS_PERMISSIONS: { action: string; roles: RoleName[] }[] = [
  { action: 'read', roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT] },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set to run the seed script.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const roleNames = Object.values(ROLE_NAME_LABELS);
    const roleRowsByName = new Map<string, { id: string }>();

    for (const name of roleNames) {
      const role = await prisma.catRole.upsert({
        where: { name },
        update: {},
        create: { name, description: ROLE_DESCRIPTIONS[name] ?? null },
      });
      roleRowsByName.set(name, role);
    }

    let permissionCount = 0;
    let grantCount = 0;

    const permissionGroups: { resource: string; entries: { action: string; roles: RoleName[] }[] }[] = [
      { resource: 'user', entries: USER_PERMISSIONS },
      { resource: 'role', entries: ROLE_PERMISSIONS },
      { resource: 'permission', entries: PERMISSION_PERMISSIONS },
      { resource: 'role-permission', entries: ROLE_PERMISSION_PERMISSIONS },
      { resource: 'church', entries: CHURCH_PERMISSIONS },
      { resource: 'district', entries: DISTRICT_PERMISSIONS },
      { resource: 'peace-house', entries: PEACE_HOUSE_PERMISSIONS },
      { resource: 'geography', entries: GEOGRAPHY_PERMISSIONS },
      { resource: 'setting', entries: SETTING_PERMISSIONS },
      { resource: 'file', entries: FILE_PERMISSIONS },
      { resource: 'person', entries: PERSON_PERMISSIONS },
      { resource: 'attendance', entries: ATTENDANCE_PERMISSIONS },
      { resource: 'meeting', entries: MEETING_PERMISSIONS },
      { resource: 'offering', entries: OFFERING_PERMISSIONS },
      { resource: 'sermon-theme', entries: SERMON_THEME_PERMISSIONS },
      { resource: 'dashboard', entries: DASHBOARD_PERMISSIONS },
      { resource: 'report', entries: REPORT_PERMISSIONS },
      { resource: 'sync', entries: SYNC_PERMISSIONS },
      { resource: 'kids-school', entries: KIDS_SCHOOL_PERMISSIONS },
      { resource: 'kids-assignment', entries: KIDS_ASSIGNMENT_PERMISSIONS },
      { resource: 'kids-child', entries: KIDS_CHILD_PERMISSIONS },
      { resource: 'kids-guardian', entries: KIDS_GUARDIAN_PERMISSIONS },
      { resource: 'kids-consent', entries: KIDS_CONSENT_PERMISSIONS },
      { resource: 'kids-attendance', entries: KIDS_ATTENDANCE_PERMISSIONS },
      { resource: 'kids-metrics', entries: KIDS_METRICS_PERMISSIONS },
    ];

    for (const { resource, entries } of permissionGroups) {
      for (const { action, roles } of entries) {
        const permission = await prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: { resource, action, description: `${resource} module — ${action}` },
        });
        permissionCount += 1;

        for (const roleName of roles) {
          const roleRow = roleRowsByName.get(ROLE_NAME_LABELS[roleName]);
          if (!roleRow) {
            throw new Error(`CatRole "${ROLE_NAME_LABELS[roleName]}" was not seeded — cannot grant permission.`);
          }

          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: roleRow.id, permissionId: permission.id } },
            update: {},
            create: { roleId: roleRow.id, permissionId: permission.id },
          });
          grantCount += 1;
        }
      }
    }

    // ------------------------------------------------------------------
    // Pastoral process stages
    // ------------------------------------------------------------------
    for (const stage of PERSON_STAGES) {
      await prisma.catPersonStage.upsert({
        where: { name: stage.name },
        update: { description: stage.description, sortOrder: stage.sortOrder },
        create: stage,
      });
    }
    // eslint-disable-next-line no-console -- standalone CLI script.
    console.log(`${PERSON_STAGES.length} CatPersonStage rows ensured.`);

    // ------------------------------------------------------------------
    // The single Church (see CHURCH_NAME above for the rationale)
    // ------------------------------------------------------------------
    // Matched by name rather than upserted on a unique key: `Church.name`
    // carries no unique constraint (the schema is prepared for a
    // multi-church future), so this is the idempotency check available —
    // and it must not fabricate a second row on a re-run.
    const existingChurch = await prisma.church.findFirst({
      where: { name: CHURCH_NAME, deletedAt: null },
    });

    if (existingChurch) {
      // eslint-disable-next-line no-console -- standalone CLI script.
      console.log(`Church "${CHURCH_NAME}" already exists — left untouched.`);
    } else {
      await prisma.church.create({ data: { name: CHURCH_NAME } });
      // eslint-disable-next-line no-console -- standalone CLI script.
      console.log(`Church created: "${CHURCH_NAME}".`);
    }

    // ------------------------------------------------------------------
    // Bootstrap administrator (see ADMIN_USERNAME above for the rationale)
    // ------------------------------------------------------------------
    const adminRole = roleRowsByName.get(ROLE_NAME_LABELS[RoleName.ADMIN]);
    if (!adminRole) {
      throw new Error('CatRole "Administrador" was not seeded — cannot create the bootstrap admin.');
    }

    /*
     * REFUSES TO PLANT THE PUBLIC PASSWORD IN PRODUCTION.
     *
     * The default is committed to this repository, so anyone who has read it
     * — which is anyone at all — can sign in as the administrator. A warning
     * printed at the end of an install log is not a control: nobody reads the
     * log of a command that succeeded. Failing closed is.
     *
     * `NODE_ENV=production` is the only signal available here, and it is the
     * one a real deployment sets. Local and demo installs are unaffected.
     */
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
      throw new Error(
        'SEED_ADMIN_PASSWORD es obligatoria cuando NODE_ENV=production. La contraseña por ' +
          'defecto está publicada en este repositorio y cualquiera podría entrar como ' +
          'administrador. Ejecute: SEED_ADMIN_PASSWORD=<secreto> pnpm db:seed',
      );
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? ADMIN_DEFAULT_PASSWORD;
    // Login credentials live on `LeadershipMember`, not `LeadershipUnit`
    // (architecture decision: see `AuthService.login` and schema.prisma) —
    // the bootstrap admin's identity check must follow the same model.
    const existingAdmin = await prisma.leadershipMember.findUnique({
      where: { username: ADMIN_USERNAME },
    });

    if (existingAdmin) {
      // Idempotency without collateral damage: the password is NOT reset on
      // a re-run. Someone who changed it after installing would otherwise
      // find it silently reverted to a publicly known default every time
      // the seeder ran — a security regression disguised as a no-op.
      // eslint-disable-next-line no-console -- standalone CLI script.
      console.log(`Bootstrap admin "${ADMIN_USERNAME}" already exists — left untouched.`);
    } else {
      const passwordHash = await hashPassword(adminPassword);

      await prisma.leadershipUnit.create({
        data: {
          type: ADMIN_TYPE,
          roleId: adminRole.id,
          // A LeadershipUnit is a couple's account, but the administrator is
          // a technical/system account: one member is enough, and doc04 §4
          // caps at two rather than requiring two.
          members: {
            create: [
              {
                firstName: 'Administrador',
                lastName: 'del Sistema',
                gender: 'N/A',
                email: null,
                phone: null,
                username: ADMIN_USERNAME,
                passwordHash,
              },
            ],
          },
        },
      });

      // eslint-disable-next-line no-console -- standalone CLI script.
      console.log(
        `Bootstrap admin created: username "${ADMIN_USERNAME}", role "${ROLE_NAME_LABELS[RoleName.ADMIN]}".`,
      );
    }

    // eslint-disable-next-line no-console -- standalone CLI script, no Nest/Pino logger available here.
    console.log(
      `Seed complete: ${roleNames.length} CatRole rows ensured (${roleNames.join(', ')}); ` +
        `${permissionCount} Permission rows and ${grantCount} RolePermission grants ensured.`,
    );

    if (!process.env.SEED_ADMIN_PASSWORD) {
      // eslint-disable-next-line no-console -- standalone CLI script.
      console.warn(
        `\n⚠  The bootstrap admin uses the default development password ("${ADMIN_DEFAULT_PASSWORD}").\n` +
          '   It is committed to this repository and therefore public. Change it before any\n' +
          '   real deployment, or seed with SEED_ADMIN_PASSWORD=<secret> pnpm db:seed.\n',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- standalone CLI script, no Nest/Pino logger available here.
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
