/**
 * THE single resolution of where the API lives.
 *
 * ── Why this module exists ───────────────────────────────────────────
 * `process.env.NEXT_PUBLIC_API_URL` used to be read in three places with
 * three different fallbacks — `undefined` in the HTTP client, `?? ''` in the
 * file and report downloads — and none of them checked it. With the variable
 * absent the app cheerfully requested `http://localhost:3000/undefined/auth/login`
 * and reported "no fue posible iniciar sesión", which sends whoever is
 * debugging it straight at the credentials instead of at the configuration.
 *
 * The variable goes missing easily: this repo's `.env` lives at the MONOREPO
 * ROOT, and Next only reads `.env` files from its own app directory. So the
 * failure is not exotic — it is what happens on a fresh clone.
 *
 * ── Why it throws instead of defaulting ──────────────────────────────
 * There is no sensible default. A relative URL would silently target the
 * Next server, which serves no API, producing 404s that look like missing
 * routes. Guessing `localhost:3001` would work on one machine and break
 * every deployment. A loud, specific error is the only honest option.
 *
 * ── Why the check is lazy ────────────────────────────────────────────
 * Throwing at module scope would break `next build`, which evaluates this
 * file while pre-rendering pages that never call the API. The check runs on
 * first use instead, so a build stays possible and any real request fails
 * with a message that names the variable and where to put it.
 */

const RAW = process.env.NEXT_PUBLIC_API_URL;

const MISSING_MESSAGE =
  'Falta la variable NEXT_PUBLIC_API_URL. Defínala en apps/web/.env.local ' +
  '(por ejemplo NEXT_PUBLIC_API_URL=http://localhost:3001) y reinicie el servidor. ' +
  'El .env de la raíz del monorepo NO alcanza: Next solo lee los de su propia carpeta.';

/**
 * Absolute base URL of the API, without a trailing slash.
 *
 * @throws when `NEXT_PUBLIC_API_URL` was not defined at build time.
 */
export function apiBaseUrl(): string {
  if (!RAW) {
    throw new Error(MISSING_MESSAGE);
  }

  // A trailing slash would produce `//auth/login`. Some servers tolerate it,
  // some 404, and the difference only shows up in one environment.
  return RAW.replace(/\/+$/, '');
}

/**
 * Whether the API location is configured, for surfaces that must render a
 * diagnostic rather than crash — the login screen above all, since a user
 * who cannot sign in is exactly who needs to be told why.
 */
export function isApiConfigured(): boolean {
  return Boolean(RAW);
}

export const API_URL_MISSING_MESSAGE = MISSING_MESSAGE;
