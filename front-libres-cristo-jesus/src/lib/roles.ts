export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PERSONAL_ADMINISTRATIVO'
  | 'LIDER_CASA_DE_PAZ'
  | 'INTEGRANTE';

export interface RoleCarrier {
  rol?: UserRole | null;
  roles?: UserRole[] | null;
}

const ROLE_PRECEDENCE: readonly UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'PERSONAL_ADMINISTRATIVO',
  'LIDER_CASA_DE_PAZ',
  'INTEGRANTE',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  PERSONAL_ADMINISTRATIVO: 'Personal Administrativo',
  LIDER_CASA_DE_PAZ: 'Líder Casa de Paz',
  INTEGRANTE: 'Integrante',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  PERSONAL_ADMINISTRATIVO: 'bg-amber-100 text-amber-800',
  LIDER_CASA_DE_PAZ: 'bg-rose-100 text-rose-800',
  INTEGRANTE: 'bg-green-100 text-green-800',
};

export function normalizeRoles(input?: RoleCarrier | UserRole | UserRole[] | null): UserRole[] {
  if (!input) {
    return [];
  }

  if (typeof input === 'string') {
    return [input];
  }

  const rawRoles = Array.isArray(input)
    ? input
    : input.roles && input.roles.length > 0
      ? input.roles
      : input.rol
        ? [input.rol]
        : [];

  return [...new Set(rawRoles)].sort(
    (left, right) => ROLE_PRECEDENCE.indexOf(left) - ROLE_PRECEDENCE.indexOf(right),
  );
}

export function getPrimaryRole(input?: RoleCarrier | null): UserRole {
  return normalizeRoles(input)[0] ?? 'INTEGRANTE';
}

export function isAdminRole(input?: RoleCarrier | UserRole | UserRole[] | null): boolean {
  const roles = normalizeRoles(input);
  return (
    roles.includes('SUPER_ADMIN') ||
    roles.includes('ADMIN') ||
    roles.includes('PERSONAL_ADMINISTRATIVO') ||
    roles.includes('LIDER_CASA_DE_PAZ')
  );
}

export function canDeleteData(input?: RoleCarrier | UserRole | UserRole[] | null): boolean {
  const roles = normalizeRoles(input);
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
}

export function canManageUsers(input?: RoleCarrier | UserRole | UserRole[] | null): boolean {
  return normalizeRoles(input).includes('SUPER_ADMIN');
}

export function canAssignCasaDePazLeader(
  input?: RoleCarrier | UserRole | UserRole[] | null,
): boolean {
  const roles = normalizeRoles(input);
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
}

export function isScopedCasaDePazLeader(
  input?: RoleCarrier | UserRole | UserRole[] | null,
): boolean {
  const roles = normalizeRoles(input);
  return (
    roles.includes('LIDER_CASA_DE_PAZ') &&
    !roles.includes('SUPER_ADMIN') &&
    !roles.includes('ADMIN') &&
    !roles.includes('PERSONAL_ADMINISTRATIVO')
  );
}

export function normalizeRoleCarrier<T extends RoleCarrier>(input: T): T & Required<RoleCarrier> {
  const roles = normalizeRoles(input);
  return {
    ...input,
    rol: getPrimaryRole({ roles, rol: input.rol }),
    roles,
  };
}
