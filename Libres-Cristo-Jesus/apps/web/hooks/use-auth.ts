'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http-client';
import {
  login as loginRequest,
  logout as logoutRequest,
  type LoginCredentials,
} from '@/lib/auth-api';
import { useSessionStore } from '@/store/session-store';
import { DEFAULT_AUTHENTICATED_ROUTE, LOGIN_ROUTE } from '@/lib/navigation';

/**
 * Generic message for a failed login. The backend answers both "no such
 * username" and "wrong password" with the same 401 on purpose (account
 * enumeration), so the UI must not invent a more specific one either.
 */
const FALLBACK_LOGIN_ERROR =
  'No fue posible iniciar sesión. Verifique sus datos e intente nuevamente.';

export interface UseLoginResult {
  submit: (credentials: LoginCredentials) => Promise<void>;
  isPending: boolean;
  /** Ready-to-render message, or `null` when there is nothing to show. */
  error: string | null;
  clearError: () => void;
}

/**
 * Drives the login form: authenticates, stores the session in memory and
 * redirects. Deliberately hand-rolled rather than a `useMutation`, because
 * the result is not cached data — it is a one-shot state transition whose
 * only outputs are the session store and the router.
 */
export function useLogin(): UseLoginResult {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setIsPending(true);
      setError(null);
      try {
        const { accessToken, user } = await loginRequest(credentials);
        setSession(accessToken, user);
        // `replace`, not `push`: the login screen must not sit in the back
        // stack of an authenticated session.
        router.replace(DEFAULT_AUTHENTICATED_ROUTE);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : FALLBACK_LOGIN_ERROR);
        // Kept pending=false only on failure; on success the component
        // unmounts with the redirect, and flipping it there would set state
        // on an unmounted tree.
        setIsPending(false);
      }
    },
    [router, setSession],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { submit, isPending, error, clearError };
}

export interface UseLogoutResult {
  submit: () => Promise<void>;
  isPending: boolean;
}

export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(async (): Promise<void> => {
    setIsPending(true);
    try {
      await logoutRequest();
    } catch {
      // A failed logout call (expired access token, network down) must never
      // trap the user in an authenticated shell. The server-side session may
      // survive, but the local one is torn down regardless — and the refresh
      // cookie it would need is already unusable in that scenario.
    } finally {
      clearSession();
      // Cached responses belong to the user who just left; leaving them would
      // let the next account briefly read them from the cache.
      queryClient.clear();
      router.replace(LOGIN_ROUTE);
    }
  }, [clearSession, queryClient, router]);

  return { submit, isPending };
}
