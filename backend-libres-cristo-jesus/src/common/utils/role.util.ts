import { Rol } from '../enums/rol.enum';

const ROLE_PRECEDENCE: readonly Rol[] = [
  Rol.SUPER_ADMIN,
  Rol.ADMIN,
  Rol.PERSONAL_ADMINISTRATIVO,
  Rol.LIDER_CASA_DE_PAZ,
  Rol.INTEGRANTE,
];

const VALID_ROLES = new Set<Rol>(Object.values(Rol));

export type RoleSource = {
  rol?: Rol | null;
  roles?: Rol[] | null;
};

export type AuthenticatedUser = RoleSource & {
  id: string;
};

const CASA_DE_PAZ_BROAD_ACCESS_ROLES: readonly Rol[] = [
  Rol.PERSONAL_ADMINISTRATIVO,
  Rol.ADMIN,
  Rol.SUPER_ADMIN,
];

export function normalizeRoles(source?: RoleSource | null): Rol[] {
  const roles =
    source?.roles?.filter((role): role is Rol => VALID_ROLES.has(role)) ?? [];

  if (roles.length > 0) {
    return [...new Set(roles)].sort(
      (left, right) =>
        ROLE_PRECEDENCE.indexOf(left) - ROLE_PRECEDENCE.indexOf(right),
    );
  }

  if (source?.rol && VALID_ROLES.has(source.rol)) {
    return [source.rol];
  }

  return [Rol.INTEGRANTE];
}

export function getPrimaryRole(source?: RoleSource | null): Rol {
  return normalizeRoles(source)[0] ?? Rol.INTEGRANTE;
}

export function hasAnyRole(
  source: RoleSource | null | undefined,
  rolesToCheck: readonly Rol[],
): boolean {
  const assignedRoles = normalizeRoles(source);
  return rolesToCheck.some((role) => assignedRoles.includes(role));
}

export function hasBroadCasaDePazAccess(
  source: RoleSource | null | undefined,
): boolean {
  return hasAnyRole(source, CASA_DE_PAZ_BROAD_ACCESS_ROLES);
}

export function isScopedCasaDePazLeader(
  source: RoleSource | null | undefined,
): boolean {
  return (
    hasAnyRole(source, [Rol.LIDER_CASA_DE_PAZ]) &&
    !hasBroadCasaDePazAccess(source)
  );
}
