import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

/**
 * Boots the real application for an end-to-end test.
 *
 * WHY THIS HELPER EXISTS RATHER THAN INLINE `Test.createTestingModule`
 * `main.ts` does two things imperatively that `AppModule` alone does not:
 * it installs `cookieParser()` and enables CORS. Guards, filters,
 * interceptors and the validation pipe DO come from `CommonModule` via
 * `APP_*` tokens, so those arrive for free — but the cookie parser does
 * not, and without it `req.cookies` is always `undefined`. An auth test
 * would then find `/auth/refresh` returning 401 forever and conclude the
 * refresh flow is broken, when the only thing broken is the test's own
 * bootstrap.
 *
 * Every divergence between this and `main.ts` is a way for the suite to
 * pass while production fails. Keep them in step.
 *
 * CORS is deliberately NOT replicated: it is a browser-enforced policy,
 * and supertest speaks to the server directly, so enabling it would test
 * nothing.
 */
export async function createE2EApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirrors main.ts:36 — required for the httpOnly refreshToken cookie.
  app.use(cookieParser());

  await app.init();
  return app;
}

/**
 * Extracts one cookie's `name=value` pair from a `set-cookie` header, ready
 * to send back on a later request.
 *
 * Supertest exposes `set-cookie` as a string array (one entry per cookie,
 * each with its own attributes), and the attributes must be stripped —
 * echoing `Path=/auth; HttpOnly` back to the server is not a cookie.
 */
export function extractCookie(
  setCookieHeader: string[] | undefined,
  name: string,
): string | undefined {
  const entry = setCookieHeader?.find((cookie) => cookie.startsWith(`${name}=`));
  return entry?.split(';')[0];
}

/** Suffix that keeps records created by a test run from colliding with earlier ones. */
export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** The envelope every response carries (doc19 §4). */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; pageSize: number; total: number; pages: number };
}

/**
 * Types a supertest response body.
 *
 * Supertest declares `body` as `any`, which makes every assertion in this
 * suite an unchecked member access — and the repo's lint rules reject
 * that, correctly: a test that reads `.data.acessToken` (sic) would
 * otherwise pass silently against `undefined`. Naming the expected shape
 * at each call site is what keeps the assertions honest.
 */
export function envelope<T>(response: { body: unknown }): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}

/** `set-cookie` as an array, whatever supertest's header typing claims. */
export function setCookies(response: { headers: Record<string, unknown> }): string[] {
  const raw = response.headers['set-cookie'];
  if (Array.isArray(raw)) {
    return raw as string[];
  }
  return typeof raw === 'string' ? [raw] : [];
}

/** Shapes these tests read out of the API. */
export interface LoginData {
  accessToken: string;
  user: { id: string; username: string; role: string };
}

export interface IdentifiedRecord {
  id: string;
}
