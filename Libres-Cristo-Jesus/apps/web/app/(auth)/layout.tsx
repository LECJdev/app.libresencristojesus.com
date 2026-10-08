import type { ReactNode } from 'react';
import { GuestGate } from '@/components/auth/session-gate';

/**
 * Frame for the public (pre-authentication) screens.
 *
 * `GuestGate` lives here rather than on the login page itself so every screen
 * added to this group — password recovery, a future first-run setup — inherits
 * the same "already signed in? go to the app" rule without restating it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <GuestGate>{children}</GuestGate>
    </div>
  );
}
