# LCJ Connect (working name)

> **Naming note:** "LCJ Connect" is an internal working name used for this
> repository, its npm scope (`@lcj/*`), and Docker resources (`lcj-*`). It is
> **not** the final commercial/product name. The final name will be decided
> separately and this document updated accordingly.

Church management SaaS platform ("Gestion Casas de Paz") for **Iglesia
Cristiana Libres en Cristo Jesus** (Colombia). The platform manages church
organizational structure, districts, Peace Houses (Casas de Paz), members,
meetings, attendance, offerings, and reporting.

All functional/business requirements live in `/Documentos` (Spanish,
business source of truth — see the note below).

## Project status: Phase 2 — Shared backend infrastructure

Phase 1 (monorepo tooling, scaffolded apps, shared config packages, local
dev services) is complete and closed. Phase 2 adds the backend's shared,
domain-agnostic infrastructure — Prisma schema/migrations, typed config,
Redis, structured (Pino/JSON) logging, the global error envelope and
exception filter, JWT signing/verification, RBAC Guards/decorators, and
audit logging — all of it reusable plumbing with **no business logic**.

There is **still no Authentication module** (no login endpoint, no
`AuthController`/`AuthService`) and **no other domain module** (Organization,
Personas, Reuniones, ...) yet — those come in later phases, built on top of
this shared infrastructure. See `Documentos/22 – Master Development
Execution Plan.md` for the full phase roadmap.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** NestJS, TypeScript, Prisma ORM + PostgreSQL (driver adapter:
  `@prisma/adapter-pg`), Redis (`ioredis`), `nestjs-pino`, `@nestjs/jwt`,
  Zod-validated configuration
- **Infra (local dev):** Docker Compose — PostgreSQL, Redis, MinIO, Mailpit
- **Tooling:** pnpm workspaces, Turborepo, ESLint (flat config), Prettier,
  Husky, lint-staged

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io) (see "Package manager" below)
- Docker + Docker Compose

### Package manager

This repo pins an exact pnpm version via the `packageManager` field in the
root `package.json`. The intended way to get it is Corepack:

```bash
corepack enable
```

> **Note:** on some Windows setups Corepack needs to write shims into the
> Node.js installation directory (e.g. `C:\Program Files\nodejs\`), which
> requires administrator rights and can fail with `EPERM` otherwise. If that
> happens, install pnpm globally instead:
>
> ```bash
> npm install -g pnpm
> ```

## Getting started

```bash
# 1. Clone the repository
git clone <repo-url>
cd libres-cristo-jesus

# 2. Copy the environment template and adjust values if needed
cp .env.example .env
# NOTE: `.env.example` doesn't exist in this repo yet (env files can't be
# written by the tooling used so far — same limitation noted since Phase 1).
# Until it does, export the required variables directly in your shell instead:
# NODE_ENV, API_PORT, DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET,
# MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, SMTP_HOST (see
# `apps/api/src/common/config/env.schema.ts` for the full typed schema —
# `apps/api` now validates these at boot and refuses to start if one is
# missing).

# 3. Start local infrastructure (PostgreSQL, Redis, MinIO, Mailpit)
docker compose up -d

# 4. Install dependencies (single install for the whole workspace)
pnpm install

# 5. Run apps/web and apps/api in dev mode
pnpm dev
```

- `apps/web` → http://localhost:3000
- `apps/api` → http://localhost:3001 (health-check: `GET /`)
- MinIO console → http://localhost:9001
- Mailpit web UI → http://localhost:8025

## Monorepo structure

```
apps/
  web/                 Next.js 15 app (App Router)
  api/                 NestJS app — shared backend infra (Phase 2): Prisma,
                       Redis, Pino logging, JWT/Guards/decorators, global
                       error envelope. Still only the health-check endpoint
                       as an actual route — no domain module yet.

packages/
  ui/                  Shared Design System (placeholder — no components yet)
  types/               Shared TypeScript types: ApiResponse<T>, BaseEntity,
                       RoleName/ROLE_NAME_LABELS, pagination meta
  config/              Shared ESLint / Prettier / TypeScript configuration
  utils/               Shared framework-agnostic utility functions (placeholder)

prisma/                Prisma schema, migrations, and seed script (root-level
                       per `Documentos/22`, not nested inside apps/api)

docs/
  architecture/        Pending — see /Documentos
  api/                 Pending — see /Documentos
  ux/                  Pending — see /Documentos
  decisions/           Pending — see /Documentos
  deployment/          Pending — see /Documentos

Documentos/            Business/functional source of truth (Spanish). Read-only
                        from the codebase's perspective — never edit these files
                        as part of implementation work.
Banco-imagenes/        Client asset bank. Out of scope for the codebase entirely.
```

## Available scripts

Run from the repository root (orchestrated with Turborepo across all
workspace packages unless noted otherwise):

| Script                   | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `pnpm dev`               | Run all apps in dev/watch mode                                 |
| `pnpm build`             | Build all apps/packages                                        |
| `pnpm lint`              | Lint the whole monorepo (must pass with zero errors)           |
| `pnpm lint:fix`          | Lint and auto-fix                                              |
| `pnpm format`            | Format the whole repo with Prettier                            |
| `pnpm format:check`      | Check formatting without writing changes                       |
| `pnpm typecheck`         | Type-check all apps/packages (`tsc --noEmit`)                  |
| `pnpm clean`             | Remove build outputs (`dist`, `.next`, `.turbo`, etc.)         |
| `pnpm docker:up`         | Start local infra services (Postgres, Redis, MinIO, Mailpit)   |
| `pnpm docker:down`       | Stop local infra services                                      |
| `pnpm docker:logs`       | Tail logs from local infra services                            |
| `pnpm db:generate`       | Generate the Prisma client (`prisma generate`)                 |
| `pnpm db:migrate`        | Create/apply a dev migration (`prisma migrate dev`)            |
| `pnpm db:migrate:deploy` | Apply pending migrations, no prompts (`prisma migrate deploy`) |
| `pnpm db:seed`           | Seed the 4 initial `CatRole` rows (idempotent)                 |
| `pnpm db:studio`         | Open Prisma Studio                                             |

A pre-commit hook (Husky + lint-staged) automatically lints and formats
staged files before every commit.

## Commit conventions & CI

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, and the rest of the
standard type set), enforced locally by a Husky `commit-msg` hook that runs
`commitlint` (config: `commitlint.config.cjs`, extending
`@commitlint/config-conventional`).

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull
request targeting `main` or `develop`: install, lint, typecheck, and build;
pull requests additionally get their commit messages linted against the same
Conventional Commits rules.

## Explicitly out of scope for Phase 1 (done in Phase 2 or later)

- ~~Prisma / database schema / migrations~~ — done in Phase 2 (see below).
- `packages/auth` and `packages/validation` (still deferred, per explicit request)
- shadcn/ui initialization and brand color tokens (pending Design System work)
- PWA support (`next-pwa`, manifest, service worker) (Phase 11)

## Explicitly out of scope for Phase 2

Phase 2 built the backend's shared infrastructure only — no business/domain
logic. Intentionally **not** part of this phase, per the roadmap in
`Documentos/22`:

- The Authentication module itself: no `/auth/login` endpoint, no
  `AuthController`/`AuthService`, no password-hashing wiring (Argon2id) —
  only the reusable JWT/Guards/decorators mechanism those will use.
- Any other business/domain module (Organization, Districts, Peace Houses,
  Personas, Meetings, Reports, ...), its controllers, entities, or DTOs.
- Request scoping by District/Casa de Paz (Guards only implement the generic
  role-check mechanism; scope-based authorization is future business logic).
- Rate limiting, CSRF protection, Helmet, and CORS configuration (doc21
  section 6 — not part of this phase's explicit deliverable list).
- A committed `.env`/`.env.example` (blocked by the tooling used so far,
  same as Phase 1 — see "Getting started" above).
