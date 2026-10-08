import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import {
  createE2EApp,
  envelope,
  uniqueSuffix,
  type IdentifiedRecord,
  type LoginData,
} from './utils/e2e-app';

/**
 * Niños + acudientes + autorización de Escuela Kids (Fase 11, segunda y
 * tercera parte) end to end.
 *
 * DRIVEN AS KIDS_LEADER/KIDS_ASSISTANT WHEREVER POSSIBLE — both roles share
 * identical operational access on every route in this suite (RN definitiva
 * del diseño aprobado); a suite written only with the leader token would
 * miss a permission regression on the assistant.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface ConsentData {
  id: string;
  kidsChildId: string;
  status: 'PENDING_AUTHORIZATION' | 'ACTIVE' | 'INACTIVE';
  documentPath: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

interface ChildDetailData {
  id: string;
  kidsSchoolId: string;
  firstName: string;
  age: number;
  version: number;
  guardians: { id: string; isPrimary: boolean; guardian: { id: string } }[];
  consent: ConsentData;
}

interface GuardianLinkData {
  id: string;
  kidsChildId: string;
  isPrimary: boolean;
  guardian: { id: string; relationship: string; version: number };
}

describe('Niños, acudientes y autorización de Escuela Kids (e2e)', () => {
  let app: INestApplication;
  let server: App;

  let adminToken: string;
  let leaderToken: string;
  let assistantToken: string;
  let foreignLeaderToken: string;

  let schoolId: string;
  let foreignSchoolId: string;
  let childId: string;
  let siblingId: string;

  const suffix = uniqueSuffix();

  function authed(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  async function login(username: string, password: string): Promise<string> {
    const response = await request(server)
      .post('/auth/login')
      .send({ username, password })
      .expect(200);
    return envelope<LoginData>(response).data.accessToken;
  }

  async function createUnit(alias: string, roleId: string): Promise<string> {
    const unit = await request(server)
      .post('/users')
      .set(authed(adminToken))
      .send({
        type: alias,
        roleId,
        members: [
          {
            firstName: alias,
            lastName: `E2E ${suffix}`,
            gender: 'M',
            username: `kch.${alias}.${suffix}`,
            password: PASSWORD,
          },
        ],
      })
      .expect(201);
    return envelope<IdentifiedRecord>(unit).data.id;
  }

  async function createSchool(name: string, leaderUnitId: string): Promise<string> {
    const school = await request(server)
      .post('/kids/schools')
      .set(authed(adminToken))
      .send({ name })
      .expect(201);
    const id = envelope<IdentifiedRecord>(school).data.id;

    await request(server)
      .post(`/kids/schools/${id}/assignments`)
      .set(authed(adminToken))
      .send({ leadershipUnitId: leaderUnitId, role: 'LEADER' })
      .expect(201);

    return id;
  }

  beforeAll(async () => {
    app = await createE2EApp();
    server = app.getHttpServer() as App;

    adminToken = await login(ADMIN.username, ADMIN.password);

    const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
    const roleId = (roleName: string) =>
      envelope<RoleData[]>(roles).data.find((role) => role.roleName === roleName)!.id;

    const leaderUnitId = await createUnit('lider', roleId('KIDS_LEADER'));
    const assistantUnitId = await createUnit('aux', roleId('KIDS_ASSISTANT'));
    const foreignLeaderUnitId = await createUnit('ajeno', roleId('KIDS_LEADER'));

    schoolId = await createSchool(`Escuela Kids Niños ${suffix}`, leaderUnitId);
    foreignSchoolId = await createSchool(`Escuela Kids Ajena ${suffix}`, foreignLeaderUnitId);

    leaderToken = await login(`kch.lider.${suffix}`, PASSWORD);
    foreignLeaderToken = await login(`kch.ajeno.${suffix}`, PASSWORD);

    await request(server)
      .post(`/kids/schools/${schoolId}/assignments`)
      .set(authed(adminToken))
      .send({ leadershipUnitId: assistantUnitId, role: 'ASSISTANT' })
      .expect(201);
    assistantToken = await login(`kch.aux.${suffix}`, PASSWORD);
  }, 60_000);

  afterAll(async () => {
    // Cierra (soft-delete) las sedes de prueba para no dejar basura en la
    // DB compartida con el entorno de desarrollo — mismo criterio que
    // kids-schools.e2e-spec.ts. Nunca borra físicamente: niños, acudientes
    // y consentimientos creados en este suite quedan intactos, solo dejan
    // de listarse.
    await request(server).delete(`/kids/schools/${schoolId}`).set(authed(adminToken));
    await request(server).delete(`/kids/schools/${foreignSchoolId}`).set(authed(adminToken));
    await app.close();
  });

  describe('Niños', () => {
    it('lets the KIDS_LEADER register a child — consent starts PENDING_AUTHORIZATION', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/children`)
        .set(authed(leaderToken))
        .send({ firstName: 'Sofía', lastName: `Kids ${suffix}`, birthDate: '2019-03-14' })
        .expect(201);

      const child = envelope<ChildDetailData>(response).data;
      childId = child.id;
      expect(child.consent.status).toBe('PENDING_AUTHORIZATION');
      expect(typeof child.age).toBe('number');
      expect(child.guardians).toHaveLength(0);
    });

    it('lets the KIDS_ASSISTANT register a child too — identical operational access', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/children`)
        .set(authed(assistantToken))
        .send({ firstName: 'Mateo', lastName: `Kids ${suffix}`, birthDate: '2018-06-01' })
        .expect(201);

      siblingId = envelope<ChildDetailData>(response).data.id;
    });

    it('lists the roster of the sede', async () => {
      const response = await request(server)
        .get(`/kids/schools/${schoolId}/children`)
        .set(authed(leaderToken))
        .expect(200);

      const ids = envelope<{ id: string }[]>(response).data.map((row) => row.id);
      expect(ids).toEqual(expect.arrayContaining([childId, siblingId]));
    });

    it('updates the child and refuses a stale version', async () => {
      const response = await request(server)
        .patch(`/kids/children/${childId}`)
        .set(authed(leaderToken))
        .send({ notes: 'Alergia al maní', version: 1 })
        .expect(200);

      expect(envelope<ChildDetailData>(response).data.version).toBe(2);

      await request(server)
        .patch(`/kids/children/${childId}`)
        .set(authed(leaderToken))
        .send({ notes: 'x', version: 1 })
        .expect(409);
    });

    it('denies a foreign KIDS_LEADER creating a child in this sede (scope)', async () => {
      await request(server)
        .post(`/kids/schools/${schoolId}/children`)
        .set(authed(foreignLeaderToken))
        .send({ firstName: 'Intruso', lastName: `Kids ${suffix}`, birthDate: '2020-01-01' })
        .expect(403);
    });

    it('denies a foreign KIDS_LEADER reading this child (scope)', async () => {
      await request(server)
        .get(`/kids/children/${childId}`)
        .set(authed(foreignLeaderToken))
        .expect(403);
    });
  });

  describe('Acudientes', () => {
    let guardianId: string;

    it('creates a new guardian and links it to the child as primary', async () => {
      const response = await request(server)
        .post(`/kids/children/${childId}/guardians`)
        .set(authed(leaderToken))
        .send({
          firstName: 'Marta',
          lastName: `Ramírez ${suffix}`,
          relationship: 'madre',
          phone: '3001234567',
          isPrimary: true,
        })
        .expect(201);

      const link = envelope<GuardianLinkData>(response).data;
      guardianId = link.guardian.id;
      expect(link.isPrimary).toBe(true);
    });

    it('links the SAME guardian to a sibling instead of duplicating it', async () => {
      const response = await request(server)
        .post(`/kids/children/${siblingId}/guardians`)
        .set(authed(leaderToken))
        .send({ guardianId })
        .expect(201);

      expect(envelope<GuardianLinkData>(response).data.guardian.id).toBe(guardianId);
    });

    it('rejects linking the same guardian twice to the same child', async () => {
      await request(server)
        .post(`/kids/children/${childId}/guardians`)
        .set(authed(leaderToken))
        .send({ guardianId })
        .expect(409);
    });

    it('edits the guardian data, shared by both children, and refuses a stale version', async () => {
      const response = await request(server)
        .patch(`/kids/guardians/${guardianId}`)
        .set(authed(leaderToken))
        .send({ phone: '3007654321', version: 1 })
        .expect(200);

      expect(envelope<{ version: number }>(response).data.version).toBe(2);

      await request(server)
        .patch(`/kids/guardians/${guardianId}`)
        .set(authed(leaderToken))
        .send({ phone: 'x', version: 1 })
        .expect(409);
    });

    it('denies a foreign KIDS_LEADER linking a guardian to this child (scope)', async () => {
      await request(server)
        .post(`/kids/children/${childId}/guardians`)
        .set(authed(foreignLeaderToken))
        .send({ firstName: 'Intruso', lastName: 'Guardian', relationship: 'tío', phone: '1' })
        .expect(403);
    });
  });

  describe('Autorización (consent)', () => {
    it('activates on the first document upload', async () => {
      const response = await request(server)
        .patch(`/kids/children/${childId}/consent`)
        .set(authed(leaderToken))
        .send({ documentPath: `kids-consent-document/${suffix}.pdf`, signedAt: '2026-08-01' })
        .expect(200);

      const consent = envelope<ConsentData>(response).data;
      expect(consent.status).toBe('ACTIVE');
      expect(consent.documentPath).toBe(`kids-consent-document/${suffix}.pdf`);
      expect(consent.uploadedAt).not.toBeNull();
    });

    it('revokes manually without touching the stored document', async () => {
      const response = await request(server)
        .patch(`/kids/children/${childId}/consent`)
        .set(authed(leaderToken))
        .send({ status: 'INACTIVE' })
        .expect(200);

      const consent = envelope<ConsentData>(response).data;
      expect(consent.status).toBe('INACTIVE');
      expect(consent.documentPath).toBe(`kids-consent-document/${suffix}.pdf`);
    });

    it('rejects a body with neither documentPath nor status', async () => {
      await request(server)
        .patch(`/kids/children/${childId}/consent`)
        .set(authed(leaderToken))
        .send({})
        .expect(400);
    });

    it('denies a foreign KIDS_LEADER updating this consent (scope)', async () => {
      await request(server)
        .patch(`/kids/children/${childId}/consent`)
        .set(authed(foreignLeaderToken))
        .send({ status: 'ACTIVE' })
        .expect(403);
    });
  });
});
