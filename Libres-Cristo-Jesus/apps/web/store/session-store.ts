import { create } from 'zustand';
import type { AuthenticatedUser } from '@lcj/types';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  status: SessionStatus;
  setSession: (accessToken: string, user: AuthenticatedUser) => void;
  clearSession: () => void;
  setStatus: (status: SessionStatus) => void;
}

/**
 * Session store — deliberately WITHOUT Zustand's `persist` middleware.
 * The access token lives in memory only and is lost on every page reload
 * by design (security decision already made for this project): a refresh
 * survives via the httpOnly `refreshToken` cookie instead, silently
 * re-hydrated by `useSessionBootstrap` on mount. Never add `persist` here
 * — that would put the access token in `localStorage`/`sessionStorage`,
 * reachable by any injected script (XSS).
 */
export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}));
