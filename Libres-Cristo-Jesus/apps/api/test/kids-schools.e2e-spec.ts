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
 * Sedes de Escuela Kids + asignaciones (Fase 11, primera parte) end to end.
 *
 * Scope de KidsSchool no viene de una jerarquía (District/PeaceHouse) sino
 * de una `KidsUserAssignment` activa — por eso el setup arma DOS sedes con
 * líderes distintos, igual que `attendance.e2e-spec.ts` arma dos Casas de
 * Paz para probar el cruce.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface SchoolData {
  id: string;
  name: string;
  status: string;
  version: number;
}

interface AssignmentData {
  id: string;
  kidsSchoolId: string;
  leadershipUnitId: string;
  role: 'LEADER' | 'ASSISTANT';
  endDate: string | null;
}

describe('Sedes de Escuela Kids (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let adminToken: string;
  let leaderToken: string;
  let assistantToken: string;
  let foreignLeaderToken: string;

  let leaderUnitId: string;
  let assistantUnitId: string;
  let foreignLeaderUnitId: string;

  let schoolId: string;
  let leaderAssignmentId: string;
  let assistantAssignmentId: string;

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
            username: `ksc.${alias}.${suffix}`,
            password: PASSWORD,
          },
        ],
      })
      .expect(201);
    return envelope<IdentifiedRecord>(unit).data.id;
  }

  beforeAll(async () => {
    app = await createE2EApp();
    server = app.getHttpServer() as App;
    prisma = app.get(PrismaService);

    adminToken = await login(ADMIN.username, ADMIN.password);

    const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
    const roleId = (roleName: string) =>
      envelope<RoleData[]>(roles).data.find((role) => role.roleName === roleName)!.id;

    leaderUnitId = await createUnit('lider', roleId('KIDS_LEADER'));
    assistantUnitId = await createUnit('aux', roleId('KIDS_ASSISTANT'));
    foreignLeaderUnitId = await createUnit('ajeno', roleId('KIDS_LEADER'));

    leaderToken = await login(`ksc.lider.${suffix}`, PASSWORD);
    assistantToken = await login(`ksc.aux.${suffix}`, PASSWORD);
    foreignLeaderToken = await login(`ksc.ajeno.${suffix}`, PASSWORD);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Sedes', () => {
    it('lets ADMIN create a sede', async () => {
      const response = await request(server)
        .post('/kids/schools')
        .set(authed(adminToken))
        .send({ name: `Escuela Kids Norte ${suffix}` })
        .expect(201);

      schoolId = envelope<SchoolData>(response).data.id;
      expect(envelope<SchoolData>(response).data.name).toBe(`Escuela Kids Norte ${suffix}`);
    });

    it('rejects a duplicate name', async () => {
      await request(server)
        .post('/kids/schools')
        .set(authed(adminToken))
        .send({ name: `Escuela Kids Norte ${suffix}` })
        .expect(409);
    });

    it('denies a KIDS_LEADER creating a sede — administrar la sede es ADMIN-only', async () => {
      await request(server)
        .post('/kids/schools')
        .set(authed(leaderToken))
        .send({ name: `Otra sede ${suffix}` })
        .expect(403);
    });

    it('denies a KIDS_LEADER without assignment from reading the sede (no scope yet)', async () => {
      await request(server).get(`/kids/schools/${schoolId}`).set(authed(leaderToken)).expect(403);
    });

    it('lets ADMIN read the sede', async () => {
      const response = await request(server)
        .get(`/kids/schools/${schoolId}`)
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<SchoolData>(response).data.id).toBe(schoolId);
    });

    it('updates the name and refuses a stale version', async () => {
      const response = await request(server)
        .patch(`/kids/schools/${schoolId}`)
        .set(authed(adminToken))
        .send({ name: `Escuela Kids Norte (renombrada) ${suffix}`, version: 1 })
        .expect(200);

      expect(envelope<SchoolData>(response).data.version).toBe(2);

      await request(server)
        .patch(`/kids/schools/${schoolId}`)
        .set(authed(adminToken))
        .send({ name: 'x', version: 1 })
        .expect(409);
    });
  });

  describe('Asignaciones', () => {
    it('lets ADMIN assign the LEADER of the sede', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/assignments`)
        .set(authed(adminToken))
        .send({ leadershipUnitId: leaderUnitId, role: 'LEADER' })
        .expect(201);

      const assignment = envelope<AssignmentData>(response).data;
      leaderAssignmentId = assignment.id;
      expect(assignment).toMatchObject({ kidsSchoolId: schoolId, role: 'LEADER', endDate: null });
    });

    it('now lets the assigned KIDS_LEADER read their own sede', async () => {
      const response = await request(server)
        .get(`/kids/schools/${schoolId}`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<SchoolData>(response).data.id).toBe(schoolId);
    });

    it('denies a KIDS_LEADER assigning another LEADER — only ADMIN replaces the líder', async () => {
      await request(server)
        .post(`/kids/schools/${schoolId}/assignments`)
        .set(authed(leaderToken))
        .send({ leadershipUnitId: foreignLeaderUnitId, role: 'LEADER' })
        .expect(403);
    });

    it('lets the KIDS_LEADER assign an ASSISTANT to their own sede', async () => {
      const response = await request(server)
        .post(`/kids/schools/${schoolId}/assignments`)
        .set(authed(leaderToken))
        .send({ leadershipUnitId: assistantUnitId, role: 'ASSISTANT' })
        .expect(201);

      const assignment = envelope<AssignmentData>(response).data;
      assistantAssignmentId = assignment.id;
      expect(assignment.role).toBe('ASSISTANT');
    });

    it('denies a foreign KIDS_LEADER (no assignment here) from assigning an assistant', async () => {
      await request(server)
        .post(`/kids/schools/${schoolId}/assignments`)
        .set(authed(foreignLeaderToken))
        .send({ leadershipUnitId: foreignLeaderUnitId, role: 'ASSISTANT' })
        .expect(403);
    });

    it('lets ADMIN and the KIDS_LEADER list the team, but denies the KIDS_ASSISTANT', async () => {
      const asAdmin = await request(server)
        .get(`/kids/schools/${schoolId}/assignments`)
        .set(authed(adminToken))
        .expect(200);
      expect(envelope<AssignmentData[]>(asAdmin).data.length).toBeGreaterThanOrEqual(2);

      await request(server)
        .get(`/kids/schools/${schoolId}/assignments`)
        .set(authed(leaderToken))
        .expect(200);

      // Managing the team is administrative — the operational role does not get it.
      await request(server)
        .get(`/kids/schools/${schoolId}/assignments`)
        .set(authed(assistantToken))
        .expect(403);
    });

    it('denies a foreign KIDS_LEADER listing this sede team (scope)', async () => {
      await request(server)
        .get(`/kids/schools/${schoolId}/assignments`)
        .set(authed(foreignLeaderToken))
        .expect(403);
    });

    it('refuses removing the LEADER assignment directly', async () => {
      await request(server)
        .delete(`/kids/schools/${schoolId}/assignments/${leaderAssignmentId}`)
        .set(authed(adminToken))
        .expect(400);
    });

    it('lets the KIDS_LEADER retire their own ASSISTANT', async () => {
      await request(server)
        .delete(`/kids/schools/${schoolId}/assignments/${assistantAssignmentId}`)
        .set(authed(leaderToken))
        .expect(200);

      const closed = await prisma.kidsUserAssignment.findUniqueOrThrow({
        where: { id: assistantAssignmentId },
      });
      expect(closed.endDate).not.toBeNull();
    });

    it('replacing the LEADER closes the previous assignment instead of holding two active ones', async () => {
      const replacement = await request(server)
        .post(`/kids/schools/${schoolId}/assignments`)
        .set(authed(adminToken))
        .send({ leadershipUnitId: foreignLeaderUnitId, role: 'LEADER' })
        .expect(201);

      const newAssignmentId = envelope<AssignmentData>(replacement).data.id;
      expect(newAssignmentId).not.toBe(leaderAssignmentId);

      const previous = await prisma.kidsUserAssignment.findUniqueOrThrow({
        where: { id: leaderAssignmentId },
      });
      expect(previous.endDate).not.toBeNull();

      const active = await prisma.kidsUserAssignment.findMany({
        where: { kidsSchoolId: schoolId, role: 'LEADER', endDate: null },
      });
      expect(active).toHaveLength(1);
      expect(active[0]!.id).toBe(newAssignmentId);
    });
  });

  describe('Cierre de sede', () => {
    it('denies a KIDS_LEADER closing their own sede — administering it is ADMIN-only', async () => {
      await request(server)
        .delete(`/kids/schools/${schoolId}`)
        .set(authed(leaderToken))
        .expect(403);
    });

    it('lets ADMIN close the sede (soft-delete, never physical)', async () => {
      await request(server)
        .delete(`/kids/schools/${schoolId}`)
        .set(authed(adminToken))
        .expect(200);

      const closed = await prisma.kidsSchool.findUniqueOrThrow({ where: { id: schoolId } });
      expect(closed.deletedAt).not.toBeNull();
      expect(closed.status).toBe('INACTIVE');

      // Nunca un borrado físico: la fila sigue existiendo, y sus niños /
      // asignaciones / reuniones históricas quedan intactos — solo la sede
      // deja de listarse.
      await request(server).get(`/kids/schools/${schoolId}`).set(authed(adminToken)).expect(404);

      const list = await request(server)
        .get('/kids/schools')
        .set(authed(adminToken))
        .expect(200);
      const ids = envelope<SchoolData[]>(list).data.map((school) => school.id);
      expect(ids).not.toContain(schoolId);
    });

    it('404s closing an already-closed sede', async () => {
      await request(server)
        .delete(`/kids/schools/${schoolId}`)
        .set(authed(adminToken))
        .expect(404);
    });
  });
});
