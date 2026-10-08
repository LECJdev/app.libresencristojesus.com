import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { createE2EApp, envelope, extractCookie, setCookies, type LoginData } from './utils/e2e-app';

/**
 * Authentication, end to end (doc19 §2, doc21 §4).
 *
 * WHAT THIS SUITE IS FOR
 * The unit tests mock Prisma and never start Nest, so they cannot see the
 * failures that actually happened during this project: a module that
 * refuses to instantiate, a route registered under a different path, a
 * guard rejecting a request the frontend depends on. Those only surface
 * when the real application boots and answers real HTTP.
 *
 * REQUIREMENTS
 * A running PostgreSQL/Redis and a seeded database (`pnpm db:seed`), which
 * is what provides the bootstrap admin these tests sign in as.
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
const REFRESH_COOKIE = 'refreshToken';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    app = await createE2EApp();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('issues an access token and sets the refresh cookie', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
        .expect(200);

      const body = envelope<LoginData>(response);
      expect(body.success).toBe(true);
      expect(typeof body.data.accessToken).toBe('string');
      expect(body.data.accessToken.length).toBeGreaterThan(0);
      expect(body.data.user).toMatchObject({ username: ADMIN_USERNAME, role: 'ADMIN' });

      // The refresh token must NEVER be in the body — that is the entire
      // point of the httpOnly-cookie decision.
      expect(envelope<LoginData>(response).data).not.toHaveProperty('refreshToken');

      const cookie = extractCookie(setCookies(response), REFRESH_COOKIE);
      expect(cookie).toBeDefined();

      const rawCookie = setCookies(response).find((entry) =>
        entry.startsWith(`${REFRESH_COOKIE}=`),
      );
      expect(rawCookie).toContain('HttpOnly');
      expect(rawCookie).toContain('Path=/auth');
    });

    it('rejects a wrong password with 401', async () => {
      await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: 'definitely-not-the-password' })
        .expect(401);
    });

    it('rejects an unknown username with 401 and the same message', async () => {
      const wrongUser = await request(server)
        .post('/auth/login')
        .send({ username: 'no-such-user', password: ADMIN_PASSWORD })
        .expect(401);

      const wrongPassword = await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: 'definitely-not-the-password' })
        .expect(401);

      // Identical messages: a different one for "no such user" would let
      // anyone enumerate valid usernames.
      expect(envelope<unknown>(wrongUser).message).toBe(envelope<unknown>(wrongPassword).message);
    });

    it('rejects a malformed body with 400', async () => {
      await request(server).post('/auth/login').send({ username: 'admin' }).expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the cookie and returns a new access token', async () => {
      const login = await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
        .expect(200);

      const cookie = extractCookie(setCookies(login), REFRESH_COOKIE);

      const refresh = await request(server)
        .post('/auth/refresh')
        .set('Cookie', cookie!)
        .expect(200);

      expect(envelope<{ accessToken: string }>(refresh).data.accessToken).toEqual(
        expect.any(String),
      );

      const rotated = extractCookie(setCookies(refresh), REFRESH_COOKIE);
      expect(rotated).toBeDefined();
      // Rotation is the security property: reusing the same refresh token
      // twice must not be possible.
      expect(rotated).not.toBe(cookie);
    });

    it('rejects a request with no cookie', async () => {
      await request(server).post('/auth/refresh').expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated profile', async () => {
      const login = await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
        .expect(200);

      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${envelope<LoginData>(login).data.accessToken}`)
        .expect(200);

      expect(envelope<LoginData['user']>(response).data).toMatchObject({
        username: ADMIN_USERNAME,
        role: 'ADMIN',
      });
      // `passwordHash` must never reach a response body.
      expect(envelope<LoginData['user']>(response).data).not.toHaveProperty('passwordHash');
    });

    it('rejects a missing token with 401', async () => {
      await request(server).get('/auth/me').expect(401);
    });

    it('rejects a malformed token with 401', async () => {
      await request(server)
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-jwt')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('invalidates the session so the refresh token stops working', async () => {
      const login = await request(server)
        .post('/auth/login')
        .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
        .expect(200);

      const cookie = extractCookie(setCookies(login), REFRESH_COOKIE);

      await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${envelope<LoginData>(login).data.accessToken}`)
        .set('Cookie', cookie!)
        .expect(200);

      // The whole purpose of logout: the refresh token it held is dead.
      await request(server).post('/auth/refresh').set('Cookie', cookie!).expect(401);
    });
  });
});
