// Prisma CLI configuration (Prisma ORM v7+).
//
// As of Prisma 7, the datasource connection string is no longer read
// from `datasource.url` in `schema.prisma` — it lives here instead. This
// file is read by the Prisma CLI (`generate`, `migrate`, `db seed`,
// `studio`) run from the monorepo root, where `prisma` is installed
// (see `Documentos/22`'s repo structure: `prisma/` is a root-level
// sibling of `apps/`/`packages/`).
//
// `DATABASE_URL` is never committed to a `.env` file in this repo yet —
// it must be exported directly in the shell before running any prisma
// command, e.g.:
//   DATABASE_URL="postgresql://lcj:change_me_dev_password@localhost:5432/lcj_connect" pnpm exec prisma migrate dev
// `dotenv/config` is still wired up (Prisma's own scaffold convention)
// so a real `.env` file works transparently once one exists — loading it
// is a no-op today since the file doesn't exist.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
