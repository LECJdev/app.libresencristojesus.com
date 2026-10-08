import { redirect } from 'next/navigation';
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/lib/navigation';

/**
 * The root path holds no screen of its own — it forwards into the app.
 *
 * Sending everyone to the dashboard (rather than branching on a session the
 * server cannot see anyway — see `components/auth/session-gate.tsx`) keeps
 * this decision in one place: `SessionGate` on the other side bounces the
 * visitor to `/login` if there is no session to restore.
 */
export default function RootPage() {
  redirect(DEFAULT_AUTHENTICATED_ROUTE);
}
