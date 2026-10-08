import type { ReactNode } from 'react';
import { SessionGate } from '@/components/auth/session-gate';
import { RouteRoleGuard } from '@/components/auth/role-gate';
import { AppShell } from '@/components/layout/app-shell';
import { SyncIndicator } from '@/components/offline/sync-indicator';

/**
 * The authenticated area. Every screen under this group is wrapped, in order:
 *
 *   SessionGate      — is there a session at all? (redirects to /login)
 *     AppShell       — the persistent navigation frame
 *       SyncIndicator  — state of anything captured offline
 *       RouteRoleGuard — may THIS role open THIS route?
 *
 * The role guard sits inside the shell on purpose: a user who lands on a
 * section their role cannot open still keeps the sidebar and header, so they
 * can navigate away instead of hitting a bare dead-end page.
 *
 * The sync indicator sits HERE, above every screen, rather than on the
 * meeting page alone (Regla 8: "el usuario deberá conocer SIEMPRE el estado
 * de sus datos"). Someone who captured attendance offline and then navigated
 * to Personas must still see that their work has not reached the server —
 * putting the notice only on the screen that produced it would hide it the
 * moment they walk away from it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <AppShell>
        <div className="flex flex-col gap-4">
          <SyncIndicator />
          <RouteRoleGuard>{children}</RouteRoleGuard>
        </div>
      </AppShell>
    </SessionGate>
  );
}
