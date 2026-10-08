import type { AuthenticatedUser } from '@lcj/types';
import { apiFetch } from './http-client';

/**
 * Thin typed wrappers over the `apps/api` auth endpoints.
 *
 * The refresh token never appears here on purpose: it travels exclusively as
 * the httpOnly `refreshToken` cookie the backend sets on `/auth/login` and
 * `/auth/refresh` (see `apps/api/src/modules/auth/auth.controller.ts`), so
 * client-side JS can neither read nor send it explicitly — `credentials:
 * 'include'` in `http-client.ts` is what carries it.
 */

export interface LoginCredentials {
  /**
   * `Documentos/19` illustrates login with an `email` field, but the real
   * credential holder (`LeadershipUnit`) has no email column — see the note
   * on `apps/api/src/modules/auth/dto/login.dto.ts`. `username` is correct.
   */
  username: string;
  password: string;
  /**
   * Backs the "Recordarme" checkbox of the doc17 login wireframe. When true
   * the backend issues a persistent (7-day) refresh cookie instead of a
   * session cookie the browser drops on close.
   */
  rememberMe: boolean;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

export function login(credentials: LoginCredentials): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
}

/** Invalidates the server-side session and clears the refresh cookie. */
export function logout(): Promise<null> {
  return apiFetch<null>('/auth/logout', { method: 'POST' });
}

export function fetchCurrentUser(): Promise<AuthenticatedUser> {
  return apiFetch<AuthenticatedUser>('/auth/me');
}
