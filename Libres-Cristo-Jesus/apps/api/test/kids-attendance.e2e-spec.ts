import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createE2EApp,
  envelope,
  uniqueSuffix,
  type IdentifiedRecord,
  type LoginData,
} from './utils/e2e-app';

/**
 * Reuniones + asistencia semanal + métricas de Escuela Kids (Fase 11,
 * cuarta parte) end to end.
 *
 * Unlike the Casas de Paz attendance module, Escuela Kids has no weekly
 * calendar lock (doc11's RN-407 exception was never approved for this
 * module) — so this suite has no locked-week block, only roster protection
 * and cross-sede scope.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface ChecklistRow {
  childId: string;
  present: boolean;
}

interface ChecklistData {
  meetingId: string;
  kidsSchoolId: string;
  isoYear: number;
  isoWeek: number;
  rows: ChecklistRow[];
  presentCount: number;
}

interface MetricsData {
  kidsSchoolId: string;
  totalChildren: number;
  present: number;
  absent: number;
  pendingConsents: number;
  newChildren: number;
  inactiveChildren: number;
  attendanceTrend: unknown[];
}

describe('Reuniones y asistencia de Escuela Kids (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let adminToken: string;
  let leaderToken: string;
  let assistantToken: string;
  let foreignLeaderToken: string;

  let schoolId: string;
  let meetingId: string;
  const childIds: string[] = [];

  let foreignSchoolId: string;
  let foreignChildId: string;

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
            username: `kat.${alias}.${suffix}`,
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
    prisma = app.get(PrismaService);

    adminToken = await login(ADMIN.username, ADMIN.password);

    const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
    const roleId = (roleName: string) =>
      envelope<RoleData[]>(roles).data.find((role) => role.roleName === roleName)!.id;

    const leaderUnitId = await createUnit('lider', roleId('KIDS_LEADER'));
    const assistantUnitId = await createUnit('aux', roleId('KIDS_ASSISTANT'));
    const foreignLeaderUnitId = await createUnit('ajeno', roleId('KIDS_LEADER'));

    schoolId = await createSchool(`Escuela Kids Asistencia ${suffix}`, leaderUnitId);
    foreignSchoolId = await createSchool(`Escuela Kids Ajena Asistencia ${suffix}`, foreignLeaderUnitId);

    await request(server)
      .post(`/kids/schools/${schoolId}/assignments`)
      .set(authed(adminToken))
      .send({ leadershipUnitId: assistantUnitId, role: 'ASSISTANT' })
      .expect(201);

    leaderToken = await login(`kat.lider.${suffix}`, PASSWORD);
    assistantToken = await login(`kat.aux.${suffix}`, PASSWORD);
    foreignLeaderToken = await login(`kat.ajeno.${suffix}`, PASSWORD);

    for (const name of ['Ana', 'Luis', 'Sara']) {
      const child = await request(server)
        .post(`/kids/schools/${schoolId}/children`)
        .set(authed(leaderToken))
        .send({ firstName: name, lastName: `Kids ${suffix}`, birthDate: '2019-01-01' })
        .expect(201);
      childIds.push(envelope<IdentifiedRecord>(child).data.id);
    }

    const foreignChild = await request(server)
      .post(`/kids/schools/${foreignSchoolId}/children`)
      .set(authed(foreignLeaderToken))
      .send({ firstName: 'Ajeno', lastName: `Kids ${suffix}`, birthDate: '2019-01-01' })
      .expect(201);
    foreignChildId = envelope<IdentifiedRecord>(foreignChild).data.id;
  }, 60_000);

  afterAll(async () => {
    // Cierra (soft-delete) las sedes de prueba para no dejar basura en la
    // DB compartida con el entorno de desarrollo — mismo criterio que
    // kids-schools.e2e-spec.ts. Nunca borra físicamente: reuniones,
    // asistencia y niños creados en este suite quedan intactos, solo
    // dejan de listarse.
    await request(server).delete(`/kids/schools/${schoolId}`).set(authed(adminToken));
    await request(server).delete(`/kids/schools/${foreignSchoolId}`).set(authed(adminToken));
    await app.close();
  });

  describe('Apertura de la semana vigente', () => {
    it('lets the KIDS_LEADER open (and lazily create) the meeting of their OWN sede', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/meetings/current`)
        .set(authed(leaderToken))
        .expect(200);

      const checklist = envelope<ChecklistData>(response).data;
      meetingId = checklist.meetingId;
      expect(checklist.rows).toHaveLength(3);
      expect(checklist.presentCount).toBe(0);
    });

    it('is idempotent — a second call returns the same meeting', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/meetings/current`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ChecklistData>(response).data.meetingId).toBe(meetingId);
    });

    it('denies a foreign KIDS_LEADER opening a sede that is not theirs', async () => {
      await request(server)
        .post(`/kids/schools/${schoolId}/meetings/current`)
        .set(authed(foreignLeaderToken))
        .expect(403);
    });
  });

  describe('Checklist', () => {
    it('marks one child present', async () => {
      const response = await request(server)
        .patch(`/kids/meetings/${meetingId}/children/${childIds[0]!}`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(1);
    });

    it('lets the KIDS_ASSISTANT mark too — identical operational access', async () => {
      const response = await request(server)
        .patch(`/kids/meetings/${meetingId}/children/${childIds[1]!}`)
        .set(authed(assistantToken))
        .send({ present: true })
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(2);
    });

    it('marks everyone with mark-all', async () => {
      const response = await request(server)
        .post(`/kids/meetings/${meetingId}/mark-all`)
        .set(authed(leaderToken))
        .send({})
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(3);
    });

    it('unmarks everyone with unmark-all', async () => {
      const response = await request(server)
        .post(`/kids/meetings/${meetingId}/unmark-all`)
        .set(authed(leaderToken))
        .send({})
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(0);
    });

    it('rejects marking a child from another sede', async () => {
      await request(server)
        .patch(`/kids/meetings/${meetingId}/children/${foreignChildId}`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(400);
    });

    it('denies a foreign KIDS_LEADER writing on a meeting that is not theirs', async () => {
      await request(server)
        .patch(`/kids/meetings/${meetingId}/children/${childIds[0]!}`)
        .set(authed(foreignLeaderToken))
        .send({ present: true })
        .expect(403);

      await request(server)
        .post(`/kids/meetings/${meetingId}/mark-all`)
        .set(authed(foreignLeaderToken))
        .send({})
        .expect(403);
    });

    it('denies a foreign KIDS_LEADER even READING the checklist', async () => {
      await request(server)
        .get(`/kids/meetings/${meetingId}`)
        .set(authed(foreignLeaderToken))
        .expect(403);
    });

    it('leaves an audit trail for the meeting and the marks', async () => {
      const entries = await prisma.auditLog.findMany({
        where: { entity: { in: ['KidsMeeting', 'KidsAttendance'] } },
        select: { entity: true, action: true },
      });

      const signatures = new Set(entries.map((entry) => `${entry.entity}/${entry.action}`));
      expect(signatures.has('KidsMeeting/OPEN')).toBe(true);
      expect(signatures.has('KidsAttendance/MARK')).toBe(true);
    });
  });

  describe('Métricas', () => {
    it('reports the sede indicators for the dashboard', async () => {
      const response = await request(server)
        .get(`/kids/schools/${schoolId}/metrics`)
        .set(authed(leaderToken))
        .expect(200);

      const metrics = envelope<MetricsData>(response).data;
      expect(metrics.totalChildren).toBe(3);
      expect(metrics.present).toBe(0);
      expect(metrics.absent).toBe(3);
      // None of the three children in this suite ever got their consent activated.
      expect(metrics.pendingConsents).toBe(3);
      expect(metrics.newChildren).toBe(3);
      expect(metrics.inactiveChildren).toBe(0);
    });

    it('denies a foreign KIDS_LEADER reading these metrics', async () => {
      await request(server)
        .get(`/kids/schools/${schoolId}/metrics`)
        .set(authed(foreignLeaderToken))
        .expect(403);
    });
  });
});
