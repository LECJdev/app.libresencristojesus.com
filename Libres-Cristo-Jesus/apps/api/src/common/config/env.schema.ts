import { z } from 'zod';

/**
 * Typed environment schema, parsed once at boot via `@nestjs/config`'s
 * `validate` hook (see `app-config.module.ts`). Covers, at minimum, the
 * variables already documented in the Phase 1 README/`.env.example`
 * (`Documentos/21 – Security Architecture & DevOps Blueprint.md`,
 * section 9 "Variables de Entorno") plus `NODE_ENV`/`API_PORT`.
 *
 * `SMTP_USER`/`SMTP_PASSWORD` are optional: the local dev SMTP server
 * (Mailpit, per `docker-compose.yml`) accepts unauthenticated mail, so
 * requiring credentials for it would break local dev. Every other
 * variable is required — a missing one throws a clear error at boot
 * instead of failing later with a confusing runtime error.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Minimum 32 chars (256 bits) so a trivially short/guessable secret can
  // never pass boot validation — HS256 signatures are only as strong as
  // this secret (found by review-risk during the Phase 2 audit).
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),

  MINIO_ENDPOINT: z.string().min(1, 'MINIO_ENDPOINT is required'),
  // Named to match the MinIO container's own bootstrap vars in
  // docker-compose.yml (and the Phase 1 .env.example) — not "ACCESS_KEY"/
  // "SECRET_KEY", so there is exactly one name per credential across the
  // whole repo instead of two names for the same value.
  MINIO_ROOT_USER: z.string().min(1, 'MINIO_ROOT_USER is required'),
  MINIO_ROOT_PASSWORD: z.string().min(1, 'MINIO_ROOT_PASSWORD is required'),

  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Origin allowed through CORS and the audience the refresh-token cookie
  // is scoped to from the browser's perspective. Defaulted (unlike every
  // other required var above) so local dev works without an explicit
  // `.env` entry — production deployments should still set this
  // explicitly to their real frontend origin.
  FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),

  // Geographic catalog source (see apps/api/src/modules/geography).
  // Consumed ONLY by the install-time seeder — the running application
  // never calls this API, so an unreachable or retired host cannot affect
  // a system whose catalogs are already populated. Defaulted so the
  // seeder works out of the box; override to point at a mirror.
  COLOMBIA_API_URL: z.string().min(1).default('https://api-colombia.com/api/v1'),
  // Per-request ceiling. Generous because `/City` returns all ~1,123
  // municipalities in a single response.
  COLOMBIA_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof envSchema>;

/**
 * `@nestjs/config`'s `ConfigModule.forRoot({ validate })` hook. Must be
 * synchronous and either return the parsed config or throw — NestJS
 * aborts bootstrap with the thrown error if validation fails.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}
