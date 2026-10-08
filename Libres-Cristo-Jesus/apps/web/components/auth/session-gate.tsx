'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Loading } from '@lcj/ui';
import { BrandMark } from '@/components/layout/app-brand';
import { useSessionStore } from '@/store/session-store';
import { DEFAULT_AUTHENTICATED_ROUTE, LOGIN_ROUTE } from '@/lib/navigation';

/**
 * WHY ROUTE PROTECTION IS CLIENT-SIDE AND NOT NEXT.JS MIDDLEWARE
 *
 * The obvious place for a redirect-if-not-logged-in rule is `middleware.ts`,
 * and it cannot work here. Two facts rule it out:
 *
 *  1. The access token lives in memory only (`store/session-store.ts`) — it is
 *     never written to a cookie, so it never reaches the Next.js server.
 *  2. The refresh token IS a cookie, but the backend scopes it to its own
 *     origin and to `path=/auth` (`apps/api/.../auth.controller.ts`). The
 *     browser therefore attaches it to `POST {API_URL}/auth/refresh` and to
 *     nothing else — never to a navigation request hitting the Next server.
 *
 * A middleware would be looking at a request with no credential in it at all,
 * and could only ever guess. That is a consequence of the httpOnly-cookie
 * decision, not an oversight: the session is re-derived in the browser by
 * `useSessionBootstrap` on every load, and these gates wait for it.
 *
 * This is a UX boundary, never a security boundary. Every protected resource
 * is protected by the backend's own guards; a user who forces their way past
 * this component reaches screens with no data in them.
 */

/** Full-viewport placeholder shown while the session is still being resolved. */
function SessionPlaceholder() {
  return (
    <Container size="md" className="flex flex-col items-center gap-6 py-16">
      <BrandMark className="size-16" />
      <Loading label="Cargando sesión…" lines={5} className="w-full max-w-sm" />
    </Container>
  );
}

/**
 * Wraps every authenticated area. Renders its children only once the session
 * is confirmed; sends the visitor to the login screen when it is not.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(LOGIN_ROUTE);
    }
  }, [status, router]);

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  // Covers 'idle', 'loading' and the frame between 'unauthenticated' and the
  // redirect actually committing — in none of those may protected UI paint.
  return <SessionPlaceholder />;
}

/**
 * The mirror image, for the public area: an already-authenticated visitor has
 * no business on the login screen, so they are bounced to the app.
 */
export function GuestGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(DEFAULT_AUTHENTICATED_ROUTE);
    }
  }, [status, router]);

  if (status === 'unauthenticated') {
    return <>{children}</>;
  }

  // 'idle'/'loading': the bootstrap may still be about to restore a session,
  // and flashing the login form before finding out is exactly the jarring
  // behaviour the placeholder exists to prevent.
  return <SessionPlaceholder />;
}
