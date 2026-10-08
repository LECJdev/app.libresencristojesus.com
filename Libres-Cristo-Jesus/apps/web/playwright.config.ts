import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the offline/sync E2E flow (Fase 10, RN-1202/RN-1203).
 *
 * Only Chromium: `page.context().setOffline(true)` plus the IndexedDB-backed
 * offline queue/persister are what these tests exercise, and cross-browser
 * network-emulation parity is not the concern here — a real browser process
 * driving the real app against the real API is (per the project's approved
 * rule: no fetch/service-worker mocking).
 *
 * Both servers are started automatically via `webServer` below, each with
 * `reuseExistingServer: true` so a server already running locally (e.g. one
 * started manually for debugging) is left alone rather than killed/restarted.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  // A COLD `nest start --watch` compile in this OneDrive-synced monorepo
  // (Windows, ts-loader, no build cache) can leave the very first request
  // to the API waiting well past Playwright's 30s default even though the
  // `webServer` health checks below already reported both servers ready —
  // opening the TCP port happens before Nest is done warming up Prisma/
  // argon2 on that first real request. 60s gives that first request room
  // without masking a real hang.
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // apps/api reads its config from the monorepo-root `.env` (see
      // apps/api/src/common/config/app-config.module.ts) — nothing extra
      // needed here beyond starting it from its own package directory.
      command: 'pnpm dev',
      cwd: path.resolve(__dirname, '../api'),
      // No dedicated health endpoint exists yet; `port` only checks that
      // something is accepting TCP connections on 3001, which is enough to
      // know Nest finished booting and is listening.
      port: 3001,
      reuseExistingServer: true,
      // La compilación en frío de `nest start --watch` (ts-loader, sin
      // caché) puede tardar más de 120s en esta máquina bajo carga (medido:
      // ~2 min) — 240s da margen real sin esconder un cuelgue genuino.
      timeout: 240_000,
    },
    {
      // `next dev` metía inestabilidad real en la suite: compilación en
      // frío por ruta (timeouts en la primera visita a cada pantalla) y
      // "Fast Refresh had to perform a full reload" a mitad de una prueba,
      // que tumbaba una navegación en curso sin que el código de la app
      // tuviera ningún problema. Un build de producción arranca una sola
      // vez y sirve siempre igual — es además el estándar recomendado por
      // Playwright para e2e.
      command: 'pnpm build && pnpm start',
      cwd: __dirname,
      // `/login` is public and always renders 200 once Next has compiled it,
      // so it doubles as a real readiness probe (not just "port open").
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      // `pnpm build` corre antes de que el servidor levante — necesita
      // margen propio además del tiempo de arranque de `next start`.
      timeout: 300_000,
      env: {
        // apps/web has no committed `.env.local`, and Next only reads `.env`
        // files from its OWN directory (see lib/api-base-url.ts) — never the
        // monorepo root. Setting it here, scoped to the spawned dev-server
        // process, avoids having to create/touch any `.env*` file for this
        // to work.
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },
    },
  ],
});
