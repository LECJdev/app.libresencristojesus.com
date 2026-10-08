import {
  Baby,
  BookOpen,
  CalendarCheck,
  Coins,
  FileBarChart,
  Home,
  LayoutDashboard,
  Network,
  ScrollText,
  Settings,
  UserRoundCheck,
  UserRoundCog,
  UsersRound,
  Map as MapIcon,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { RoleName } from '@lcj/types';

/**
 * Single source of truth for the application's navigation tree.
 *
 * The item list itself comes from `Documentos/25` section 3 ("Menú lateral":
 * Dashboard, Organigrama, Distritos, Casas de Paz, Personas, Reuniones,
 * Reportes, Configuración), plus Auditoría — which doc25 omits from that list
 * but `Documentos/05-roles-y-permisos.md` line 537 names explicitly as a
 * sidebar module ("Si un Pastor de Distrito no tiene acceso a Auditoría, ese
 * módulo no debe aparecer en el menú lateral").
 *
 * `roles` answers one question only: can this role do ANYTHING at all inside
 * this module? It is module-level visibility, not action-level authorization
 * — a Líder may open Personas but still not see a "Nuevo Usuario" button
 * there (doc05 line 536). Action-level gating belongs to each module, in the
 * phases that build them, and is ultimately enforced by the backend's
 * `Permission`/`RolePermission` tables; this array only decides what appears
 * in the menu.
 */
export interface AppNavItem {
  /** Stable id — also the React key handed to `<Sidebar>`/`<BottomNavigation>`. */
  id: string;
  /** Visible label. Spanish, per doc25. */
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see and open this section. */
  roles: readonly RoleName[];
  /**
   * Surfaces this item in the mobile `<BottomNavigation>`. That bar is a
   * fixed row of equal-width targets, so it holds the few most-used
   * destinations rather than the whole tree — the rest stay reachable from
   * the drawer opened by the header's menu button.
   */
  primary?: boolean;
}

const EVERY_ROLE = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
  RoleName.LEADER,
] as const;

const ADMIN_ONLY = [RoleName.ADMIN] as const;

export const NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    // doc05 matrix: "Dashboard Casa" is ✅ for all four roles, so every role
    // has *a* dashboard — which one it renders is decided inside the module.
    // KIDS_LEADER/KIDS_ASSISTANT are added on top of `EVERY_ROLE`: they are
    // outside doc05's four-role matrix entirely (Escuela Kids, Fase 11), but
    // `DEFAULT_AUTHENTICATED_ROUTE` sends every role here after login, and
    // `dashboard/page.tsx`'s `SHORTCUTS_BY_ROLE` already branches for both
    // of them — excluding them from this item would 403 them the moment
    // they sign in.
    roles: [...EVERY_ROLE, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT],
    primary: true,
  },
  {
    id: 'organigrama',
    label: 'Organigrama',
    href: '/organigrama',
    icon: Network,
    // doc05 matrix: "Ver Organigrama" ✅✅✅✅.
    roles: EVERY_ROLE,
  },
  {
    id: 'pastores-generales',
    label: 'Pastores Generales',
    href: '/pastores-generales',
    icon: UserRoundCog,
    // doc06 §2 places this account directly under the church. Every role
    // may consult it (it is the head of the organigrama, and doc06 §4 makes
    // the whole organigrama readable by everyone); only the Administrador
    // can modify it, which the screen itself enforces.
    roles: EVERY_ROLE,
  },
  {
    id: 'distritos',
    label: 'Distritos',
    href: '/distritos',
    icon: MapIcon,
    // doc05 matrix denies Crear/Editar Distrito to DISTRICT_PASTOR, but
    // Policy 2 ("un Pastor de Distrito únicamente podrá consultar
    // información de su Distrito") gives them read access to their own —
    // so the module is visible to them and the write actions are not.
    // LEADER is scoped to a single Casa de Paz (Policy 1) and has no
    // district-level view at all.
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR],
  },
  {
    id: 'pastores-distrito',
    label: 'Pastores de Distrito',
    href: '/pastores-distrito',
    icon: UserRoundCheck,
    // doc05 matrix: "Crear Distrito"/"Editar Distrito" are ✅ only for
    // Administrador and Pastor General (❌ Pastor Distrito) — managing the
    // account of a Pastor Distrito follows the same rule, since a District
    // Pastor administers their own district's data (Policy 2) but not the
    // roster of District Pastors itself.
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR],
  },
  {
    id: 'casas-de-paz',
    label: 'Casas de Paz',
    href: '/casas-de-paz',
    icon: Home,
    // Every role reaches at least one Casa de Paz: the Líder sees the one
    // they administer (Policy 1), the others see theirs by scope.
    roles: EVERY_ROLE,
    primary: true,
  },
  {
    id: 'lideres',
    label: 'Líderes',
    href: '/lideres',
    icon: UsersRound,
    // doc05: "Crear Usuario Líder" ✅ Administrador / Pastor General /
    // Pastor Distrito, ❌ Líder. A Líder does not administer other
    // leaders, so the section is not offered to them at all.
    roles: [RoleName.ADMIN, RoleName.GENERAL_PASTOR, RoleName.DISTRICT_PASTOR],
  },
  {
    id: 'personas',
    label: 'Personas',
    href: '/personas',
    icon: Users,
    roles: EVERY_ROLE,
    primary: true,
  },
  {
    id: 'reuniones',
    label: 'Reuniones',
    href: '/reuniones',
    icon: CalendarCheck,
    // Registrar Asistencia/Ofrenda/Reunión is ADMIN+LEADER only in the doc05
    // matrix, but pastors supervise those records for their scope, so the
    // module is visible to all and the write actions are gated per action.
    roles: EVERY_ROLE,
    primary: true,
  },
  {
    id: 'kids',
    label: 'Escuela Kids',
    href: '/kids',
    icon: Baby,
    // Módulo independiente de Casas de Paz (Fase 11): `prisma/seed.ts`
    // (`KIDS_SCHOOL_PERMISSIONS` y afines) concede acceso únicamente a
    // ADMIN, KIDS_LEADER y KIDS_ASSISTANT — ninguno de los otros roles
    // tiene permisos sobre este dominio, así que el resto ni lo ve en el
    // menú ni lo alcanza escribiendo la URL (`RouteRoleGuard`).
    roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT],
  },
  {
    id: 'kids-organigrama',
    label: 'Organigrama Kids',
    href: '/kids/organigrama',
    icon: Network,
    // Mismo criterio de acceso que el resto de `/kids/*` (ver comentario del
    // item 'kids' arriba): módulo independiente de Casas de Paz, con su
    // propio organigrama — no reemplaza ni comparte ruta con 'organigrama'.
    roles: [RoleName.ADMIN, RoleName.KIDS_LEADER, RoleName.KIDS_ASSISTANT],
  },
  {
    id: 'mapa',
    label: 'Mapa',
    href: '/mapa',
    icon: MapPin,
    // doc11 RN-1103: the national map reads only registered departments and
    // municipalities, and every role sees it narrowed to its own scope.
    roles: EVERY_ROLE,
  },
  {
    id: 'ofrendas',
    label: 'Ofrendas',
    href: '/ofrendas',
    icon: Coins,
    // doc05's "Registrar Ofrenda" is Administrador + Líder, but Rol 2's own
    // narrative grants Pastores Generales "Visualizar todas las ofrendas" —
    // and the backend seeds `offering:read` for all four accordingly. This
    // section only READS: registering happens inside the meeting, where the
    // weekly lock applies.
    roles: EVERY_ROLE,
  },
  {
    id: 'temas',
    label: 'Temas',
    href: '/temas',
    icon: BookOpen,
    // The catalog is global and every role consults it; who may add or
    // remove a theme is decided inside the screen (doc05).
    roles: EVERY_ROLE,
  },
  {
    id: 'reportes',
    label: 'Reportes',
    href: '/reportes',
    icon: FileBarChart,
    // doc05 matrix: "Exportar Excel" ✅✅✅✅.
    roles: EVERY_ROLE,
    primary: true,
  },
  {
    id: 'auditoria',
    label: 'Auditoría',
    href: '/auditoria',
    icon: ScrollText,
    // doc05 matrix: "Ver Auditoría" ✅❌❌❌.
    roles: ADMIN_ONLY,
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    // doc05 matrix: "Configurar Sistema" ✅❌❌❌.
    roles: ADMIN_ONLY,
  },
];

/** Where an authenticated user lands when no specific destination is known. */
export const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

/** The public entry point. */
export const LOGIN_ROUTE = '/login';

export function canRoleAccess(item: AppNavItem, role: RoleName): boolean {
  return item.roles.includes(role);
}

/** The full menu this role is allowed to see, in declaration order. */
export function navItemsForRole(role: RoleName): AppNavItem[] {
  return NAV_ITEMS.filter((item) => canRoleAccess(item, role));
}

/** The subset of the role's menu that fits the mobile bottom bar. */
export function primaryNavItemsForRole(role: RoleName): AppNavItem[] {
  return navItemsForRole(role).filter((item) => item.primary === true);
}

/**
 * Matches a pathname to the nav item that owns it. Nested routes
 * (`/personas/123`) must highlight their parent (`/personas`), so the match
 * is prefix-based — with the boundary check that stops `/reportes` from
 * being claimed by a hypothetical `/report`.
 */
export function findNavItemByPathname(pathname: string): AppNavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
