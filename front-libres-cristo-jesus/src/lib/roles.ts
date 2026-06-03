export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PERSONAL_ADMINISTRATIVO'
  | 'INTEGRANTE';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  PERSONAL_ADMINISTRATIVO: 'Personal Administrativo',
  INTEGRANTE: 'Integrante',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  PERSONAL_ADMINISTRATIVO: 'bg-amber-100 text-amber-800',
  INTEGRANTE: 'bg-green-100 text-green-800',
};

export function isAdminRole(role?: UserRole | null): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'PERSONAL_ADMINISTRATIVO'
  );
}

export function canDeleteData(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN';
}
