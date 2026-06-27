import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  Home,
  LayoutDashboard,
  MapPin,
  Network,
  QrCode,
  ShieldCheck,
  Users,
  Users2,
} from 'lucide-react';
import { normalizeRoles, type RoleCarrier, type UserRole } from '@/lib/roles';

export type AdminSectionId =
  | 'dashboard'
  | 'attendance.overview'
  | 'attendance.dominical'
  | 'attendance.dicipulado'
  | 'attendance.casa-paz'
  | 'events'
  | 'reports'
  | 'qr'
  | 'structure.personas'
  | 'structure.redes'
  | 'structure.sedes'
  | 'structure.distritos'
  | 'users';

export interface AdminSectionDefinition {
  id: AdminSectionId;
  label: string;
  path: string;
  matchers: readonly string[];
  navGroup: 'main' | 'structure' | 'super-admin' | 'attendance';
  icon: LucideIcon;
  description?: string;
}

const ADMIN_SECTIONS: readonly AdminSectionDefinition[] = [
  {
    id: 'dashboard',
    label: 'Panel General',
    path: '/admin',
    matchers: ['/admin'],
    navGroup: 'main',
    icon: LayoutDashboard,
  },
  {
    id: 'attendance.overview',
    label: 'Asistencia',
    path: '/admin/asistencias',
    matchers: ['/admin/asistencias'],
    navGroup: 'main',
    icon: CalendarCheck,
  },
  {
    id: 'attendance.dominical',
    label: 'Dominical',
    path: '/admin/asistencias/dominical',
    matchers: ['/admin/asistencias/dominical'],
    navGroup: 'attendance',
    icon: CalendarDays,
    description:
      'Configure attendance by campus and register people through a recurring weekly QR flow.',
  },
  {
    id: 'attendance.dicipulado',
    label: 'Dicipulado',
    path: '/admin/asistencias/dicipulado',
    matchers: ['/admin/asistencias/dicipulado'],
    navGroup: 'attendance',
    icon: Users2,
    description:
      'Configure attendance by campus or custom address, with optional network assignment and recurring QR.',
  },
  {
    id: 'attendance.casa-paz',
    label: 'Casa de Paz',
    path: '/admin/asistencias/casa-paz',
    matchers: ['/admin/asistencias/casa-paz'],
    navGroup: 'attendance',
    icon: Home,
    description:
      'Manage attendance by network with house address details and public QR registration.',
  },
  {
    id: 'events',
    label: 'Registros de Eventos',
    path: '/admin/eventos',
    matchers: ['/admin/eventos'],
    navGroup: 'main',
    icon: CalendarCheck,
  },
  {
    id: 'reports',
    label: 'Reportes',
    path: '/admin/reportes',
    matchers: ['/admin/reportes'],
    navGroup: 'main',
    icon: BarChart3,
  },
  {
    id: 'qr',
    label: 'Generador QR',
    path: '/admin/qr',
    matchers: ['/admin/qr'],
    navGroup: 'main',
    icon: QrCode,
  },
  {
    id: 'structure.personas',
    label: 'Personas',
    path: '/admin/personas',
    matchers: ['/admin/personas'],
    navGroup: 'structure',
    icon: Users,
  },
  {
    id: 'structure.redes',
    label: 'Redes',
    path: '/admin/redes',
    matchers: ['/admin/redes'],
    navGroup: 'structure',
    icon: Network,
  },
  {
    id: 'structure.sedes',
    label: 'Sedes',
    path: '/admin/sedes',
    matchers: ['/admin/sedes'],
    navGroup: 'structure',
    icon: Building2,
  },
  {
    id: 'structure.distritos',
    label: 'Distritos',
    path: '/admin/distritos',
    matchers: ['/admin/distritos'],
    navGroup: 'structure',
    icon: MapPin,
  },
  {
    id: 'users',
    label: 'Gestión de Usuarios',
    path: '/admin/usuarios',
    matchers: ['/admin/usuarios'],
    navGroup: 'super-admin',
    icon: ShieldCheck,
  },
];

const ALL_STANDARD_ADMIN_SECTIONS: readonly AdminSectionId[] = ADMIN_SECTIONS
  .filter((section) => section.id !== 'users')
  .map((section) => section.id);

const ROLE_SECTION_ACCESS: Record<UserRole, readonly AdminSectionId[]> = {
  SUPER_ADMIN: ADMIN_SECTIONS.map((section) => section.id),
  ADMIN: ALL_STANDARD_ADMIN_SECTIONS,
  PERSONAL_ADMINISTRATIVO: ALL_STANDARD_ADMIN_SECTIONS,
  LIDER_CASA_DE_PAZ: ['attendance.casa-paz'],
  INTEGRANTE: [],
};

function matchesPath(pathname: string, path: string): boolean {
  if (path === '/admin') {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function getAdminSectionById(sectionId: AdminSectionId): AdminSectionDefinition {
  const section = ADMIN_SECTIONS.find((item) => item.id === sectionId);

  if (!section) {
    throw new Error(`Unknown admin section: ${sectionId}`);
  }

  return section;
}

export function resolveAdminSection(pathname: string): AdminSectionDefinition | null {
  const matches = ADMIN_SECTIONS.filter((section) =>
    section.matchers.some((path) => matchesPath(pathname, path)),
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((left, right) => right.path.length - left.path.length)[0] ?? null;
}

export function getAllowedAdminSectionIds(input?: RoleCarrier | UserRole | UserRole[] | null): AdminSectionId[] {
  const roles = normalizeRoles(input);
  const allowed = new Set<AdminSectionId>();

  roles.forEach((role) => {
    ROLE_SECTION_ACCESS[role]?.forEach((sectionId) => {
      allowed.add(sectionId);
    });
  });

  return ADMIN_SECTIONS.filter((section) => allowed.has(section.id)).map((section) => section.id);
}

export function hasAdminSectionAccess(
  input: RoleCarrier | UserRole | UserRole[] | null | undefined,
  sectionId: AdminSectionId,
): boolean {
  return getAllowedAdminSectionIds(input).includes(sectionId);
}

export function canAccessAdminPath(
  input: RoleCarrier | UserRole | UserRole[] | null | undefined,
  pathname: string,
): boolean {
  const section = resolveAdminSection(pathname);

  if (!section) {
    return false;
  }

  return hasAdminSectionAccess(input, section.id);
}

export function getDefaultAdminPath(
  input: RoleCarrier | UserRole | UserRole[] | null | undefined,
): string | null {
  const allowedSections = getAllowedAdminSectionIds(input);

  if (allowedSections.includes('dashboard')) {
    return '/admin';
  }

  return allowedSections[0] ? getAdminSectionById(allowedSections[0]).path : null;
}

export function getAdminSectionsForGroup(
  input: RoleCarrier | UserRole | UserRole[] | null | undefined,
  navGroup: AdminSectionDefinition['navGroup'],
): AdminSectionDefinition[] {
  const allowedSections = new Set(getAllowedAdminSectionIds(input));

  return ADMIN_SECTIONS.filter(
    (section) => section.navGroup === navGroup && allowedSections.has(section.id),
  );
}

export function getAdminNavigationSections(
  input: RoleCarrier | UserRole | UserRole[] | null | undefined,
): {
  main: AdminSectionDefinition[];
  structure: AdminSectionDefinition[];
  attendance: AdminSectionDefinition[];
  superAdmin: AdminSectionDefinition[];
} {
  const attendanceSections = getAdminSectionsForGroup(input, 'attendance');
  const mainSections = getAdminSectionsForGroup(input, 'main');
  const hasAttendanceOverview = mainSections.some((section) => section.id === 'attendance.overview');

  return {
    main: hasAttendanceOverview
      ? mainSections
      : mainSections.filter((section) => section.id !== 'attendance.overview').concat(attendanceSections),
    structure: getAdminSectionsForGroup(input, 'structure'),
    attendance: attendanceSections,
    superAdmin: getAdminSectionsForGroup(input, 'super-admin'),
  };
}
