'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { Button, EmptyState } from '@lcj/ui';
import type { RoleName } from '@lcj/types';
import { useSessionStore } from '@/store/session-store';
import { DEFAULT_AUTHENTICATED_ROUTE, findNavItemByPathname } from '@/lib/navigation';

/**
 * Role-based protection for a screen or a fragment of one.
 *
 * Like `SessionGate`, this is a UX boundary: it keeps a user out of a place
 * their role has nothing to do in, so they get a clear explanation instead of
 * an empty screen or a wall of 403s. Authorization itself is enforced by the
 * backend guards and the `Permission`/`RolePermission` tables — never here.
 */

/**
 * doc18 §21: an empty/blocked screen carries illustration + message + a way
 * out. Denying access without offering a route back is a dead end.
 */
function Forbidden() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="No tiene acceso a esta sección"
      description="Su rol no cuenta con permisos para consultar esta información. Si cree que se trata de un error, comuníquese con el administrador del sistema."
      action={
        <Button asChild variant="secondary">
          <Link href={DEFAULT_AUTHENTICATED_ROUTE}>Volver al Dashboard</Link>
        </Button>
      }
    />
  );
}

export interface RoleGateProps {
  /** Roles allowed through. */
  allow: readonly RoleName[];
  children: ReactNode;
  /**
   * What to render instead of the children when the role is not allowed.
   * Defaults to the full "no tiene acceso" screen; pass `null` to hide a
   * fragment silently (the right choice for a button inside a page the user
   * is otherwise allowed to see — doc05 line 536).
   */
  fallback?: ReactNode;
}

export function RoleGate({ allow, children, fallback }: RoleGateProps) {
  const user = useSessionStore((state) => state.user);

  // No user means the session has not resolved yet; `SessionGate` above is
  // already showing a placeholder, so rendering anything here would only
  // flash a denial at someone who may well be allowed.
  if (!user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return fallback === undefined ? <Forbidden /> : <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Applies the navigation matrix to whatever route is currently open, so a
 * section hidden from the menu is also unreachable by typing its URL — the
 * two can never disagree, because both read `NAV_ITEMS`.
 *
 * Routes with no nav entry (a detail screen outside the menu, a settings
 * sub-page) are let through: this guard only enforces what the matrix
 * actually states, and the screen itself declares its own `RoleGate` when it
 * needs a stricter rule.
 */
export function RouteRoleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useSessionStore((state) => state.user);
  const navItem = findNavItemByPathname(pathname);

  if (!user || !navItem) {
    return <>{children}</>;
  }

  return <RoleGate allow={navItem.roles}>{children}</RoleGate>;
}
