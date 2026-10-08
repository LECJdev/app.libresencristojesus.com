'use client';

import { useEffect, useRef } from 'react';
import type { AuthenticatedUser } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';
import { useSessionStore } from '@/store/session-store';

/**
 * Runs once on app mount to silently restore a session from the httpOnly
 * `refreshToken` cookie (if any survived a previous visit) — the access
 * token itself is never persisted (see `store/session-store.ts`), so every
 * full page load starts from scratch and must re-derive it this way.
 *
 * Flow: `POST /auth/refresh` (cookie-only, no body) -> on success, store
 * the new access token and fetch `GET /auth/me` -> `status: 'authenticated'`.
 * Any failure (no cookie, expired, revoked) -> `status: 'unauthenticated'`,
 * no error surfaced — this is expected for a first-time/logged-out visitor.
 */
export function useSessionBootstrap(): void {
  const setSession = useSessionStore((state) => state.setSession);
  const setStatus = useSessionStore((state) => state.setStatus);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    let cancelled = false;

    async function bootstrap(): Promise<void> {
      setStatus('loading');
      try {
        const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });
        const user = await apiFetch<AuthenticatedUser>('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!cancelled) {
          setSession(accessToken, user);
        }
      } catch {
        // Expected when there's no prior session (no refresh cookie) —
        // anything other than a 401 here is still treated as
        // "unauthenticated" since there's nothing actionable to do with
        // it at bootstrap time.
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setSession, setStatus]);
}
