import { validateEnv } from './env.schema';

const REQUIRED_ENV: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-characters-long',
  MINIO_ENDPOINT: 'localhost',
  MINIO_ROOT_USER: 'minioadmin',
  MINIO_ROOT_PASSWORD: 'minioadmin',
  SMTP_HOST: 'localhost',
};

describe('validateEnv', () => {
  it('parses a valid, complete environment', () => {
    const parsed = validateEnv({ ...REQUIRED_ENV, NODE_ENV: 'test', API_PORT: '3001' });
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.API_PORT).toBe(3001);
    expect(parsed.DATABASE_URL).toBe(REQUIRED_ENV.DATABASE_URL);
  });

  it('applies defaults for NODE_ENV and API_PORT when omitted', () => {
    const parsed = validateEnv({ ...REQUIRED_ENV });
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.API_PORT).toBe(3001);
  });

  it('applies the localhost default for FRONTEND_URL when omitted', () => {
    const parsed = validateEnv({ ...REQUIRED_ENV });
    expect(parsed.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('throws a clear error naming the missing variable', () => {
    const { DATABASE_URL: _omit, ...withoutDatabaseUrl } = REQUIRED_ENV;
    expect(() => validateEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('allows SMTP_USER/SMTP_PASSWORD to be omitted (local Mailpit needs no auth)', () => {
    const parsed = validateEnv({ ...REQUIRED_ENV });
    expect(parsed.SMTP_USER).toBeUndefined();
    expect(parsed.SMTP_PASSWORD).toBeUndefined();
  });
});
