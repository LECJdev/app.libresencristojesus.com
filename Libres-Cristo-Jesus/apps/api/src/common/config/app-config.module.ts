import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { AppConfigService } from './app-config.service';

/**
 * The `.env` lives at the MONOREPO ROOT — one file shared by the API and
 * the Prisma CLI (see `prisma.config.ts`), so the database URL can never
 * drift between the app and its migrations.
 *
 * Resolved from THIS FILE, not from `process.cwd()`, because the cwd
 * differs by entry point (`apps/api` under `nest start` and Jest, the
 * repo root under Turbo). With a cwd-relative path, launching from the
 * wrong folder looks exactly like a missing variable — same error, very
 * different cause.
 *
 * Five levels up covers both layouts, since `dist/` mirrors `src/`:
 *   src/common/config  -> apps/api -> apps -> <root>
 *   dist/common/config -> apps/api -> apps -> <root>
 */
const ROOT_ENV_FILE = join(__dirname, '..', '..', '..', '..', '..', '.env');

/**
 * Global typed configuration module. `@nestjs/config`'s `ConfigModule`
 * parses `process.env` exactly once at boot through the Zod-based
 * `validateEnv` function (see `env.schema.ts`) and throws a clear error
 * if a required variable is missing — instead of failing later with a
 * confusing runtime error deep inside Prisma/Redis/JWT.
 *
 * `@Global()` so `AppConfigService` can be injected anywhere in the app
 * without every feature module re-importing this one.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // A variable already exported in the shell still wins over the file —
      // that is how CI and production inject real secrets without a `.env`.
      envFilePath: ROOT_ENV_FILE,
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
