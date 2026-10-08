import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Ergonomic, typed wrapper around `@nestjs/config`'s `ConfigService`.
 * Every other shared-infra service (Prisma, Redis, Token, Logger) reads
 * configuration through this class instead of touching `process.env`
 * directly, so there is exactly one place that knows the env var names.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get apiPort(): number {
    return this.configService.get('API_PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.configService.get('REDIS_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.configService.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get minioEndpoint(): string {
    return this.configService.get('MINIO_ENDPOINT', { infer: true });
  }

  get minioRootUser(): string {
    return this.configService.get('MINIO_ROOT_USER', { infer: true });
  }

  get minioRootPassword(): string {
    return this.configService.get('MINIO_ROOT_PASSWORD', { infer: true });
  }

  get smtpHost(): string {
    return this.configService.get('SMTP_HOST', { infer: true });
  }

  get smtpUser(): string | undefined {
    return this.configService.get('SMTP_USER', { infer: true });
  }

  get smtpPassword(): string | undefined {
    return this.configService.get('SMTP_PASSWORD', { infer: true });
  }

  get frontendUrl(): string {
    return this.configService.get('FRONTEND_URL', { infer: true });
  }

  /** Base URL of the geographic catalog source — install-time seeder only. */
  get colombiaApiUrl(): string {
    return this.configService.get('COLOMBIA_API_URL', { infer: true });
  }

  get colombiaApiTimeoutMs(): number {
    return this.configService.get('COLOMBIA_API_TIMEOUT_MS', { infer: true });
  }
}
