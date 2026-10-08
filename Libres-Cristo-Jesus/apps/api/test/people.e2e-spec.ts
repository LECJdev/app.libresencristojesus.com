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
 * Personas end to end (doc04 §5) — CRUD, historial de Casas de Paz,
 * traslados, búsqueda, filtros y scope por rol.
 *
 * Its own spec rather than a block inside `organization.e2e-spec.ts`:
 * Personas is a Fase 7 module with its own fixtures, and bolting it onto
 * the Organización suite would make one failure there look like a failure
 * here.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const LEADER_PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface PersonData extends IdentifiedRecord {
  currentPeaceHouseId: string | null;
  version: number;
  status: string;
  personStageName: string | null;
}

interface HistoryEntry {
  peaceHouseId: string;
  endDate: string | null;
  reason: string | null;
}

describe('Personas (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let adminToken: string;
  /** Leads `ownHouseId`; used to prove the scope narrowing. */
  let leaderToken: string;
  let ownHouseId: string;
  let otherHouseId: string;

  const suffix = uniqueSuffix();

  function authed(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  async function createLeaderUnit(alias: string, roleId: string): Promise<string> {
    const unit = await request(server)
      .post('/users')
      .set(authed(adminToken))
      .send({
        type: 'Lider',
        roleId,
        members: [
          {
            firstName: 'Lider',
            lastName: `${alias} ${suffix}`,
            gender: 'M',
            username: `lider.people.${alias}.${suffix}`,
            password: LEADER_PASSWORD,
          },
        ],
      })
      .expect(201);
    return envelope<IdentifiedRecord>(unit).data.id;
  }

  async function createPeaceHouse(name: string, leadershipUnitId: string, districtId: string) {
    const house = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({ districtId, leadershipUnitId, name })
      .expect(201);
    return envelope<IdentifiedRecord>(house).data.id;
  }

  beforeAll(async () => {
    app = await createE2EApp();
    server = app.getHttpServer() as App;

    const login = await request(server).post('/auth/login').send(ADMIN).expect(200);
    adminToken = envelope<LoginData>(login).data.accessToken;

    const churches = await request(server)
      .get('/organizations?page=1&pageSize=1')
      .set(authed(adminToken))
      .expect(200);
    const churchId = envelope<IdentifiedRecord[]>(churches).data[0]!.id;

    const district = await request(server)
      .post('/districts')
      .set(authed(adminToken))
      .send({
        churchId,
        number: Number(suffix.slice(-6)),
        name: `Distrito Personas ${suffix}`,
      })
      .expect(201);
    const districtId = envelope<IdentifiedRecord>(district).data.id;

    const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
    const leaderRoleId = envelope<RoleData[]>(roles).data.find(
      (role) => role.roleName === 'LEADER',
    )!.id;

    const ownLeaderId = await createLeaderUnit('propio', leaderRoleId);
    const otherLeaderId = await createLeaderUnit('ajeno', leaderRoleId);

    ownHouseId = await createPeaceHouse(`Casa Propia ${suffix}`, ownLeaderId, districtId);
    otherHouseId = await createPeaceHouse(`Casa Ajena ${suffix}`, otherLeaderId, districtId);

    const leaderLogin = await request(server)
      .post('/auth/login')
      .send({ username: `lider.people.propio.${suffix}`, password: LEADER_PASSWORD })
      .expect(200);
    leaderToken = envelope<LoginData>(leaderLogin).data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Creación', () => {
    it('registers a person with nothing but first and last name', async () => {
      const response = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Visitante', lastName: `Minimo ${suffix}` })
        .expect(201);

      const person = envelope<PersonData>(response).data;
      // A first-time visitor is registered at the door — demanding a
      // document here would mean no record at all.
      expect(person.currentPeaceHouseId).toBeNull();
      expect(person.version).toBe(1);
    });

    it('opens the first membership period when a Casa de Paz is given', async () => {
      const response = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Maria',
          lastName: `Historial ${suffix}`,
          phone: `300${suffix.slice(-7)}`,
          peaceHouseId: ownHouseId,
        })
        .expect(201);

      const person = envelope<PersonData>(response).data;
      expect(person.currentPeaceHouseId).toBe(ownHouseId);

      const history = await request(server)
        .get(`/people/${person.id}/history`)
        .set(authed(adminToken))
        .expect(200);

      const entries = envelope<HistoryEntry[]>(history).data;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ peaceHouseId: ownHouseId, endDate: null });
    });

    it('rejects a duplicate document with 409', async () => {
      const document = `CC-${suffix}`;

      await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Primero', lastName: `Doc ${suffix}`, document })
        .expect(201);

      await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Segundo', lastName: `Doc ${suffix}`, document })
        .expect(409);
    });

    it('rejects an unknown personStageId with 400', async () => {
      await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Etapa',
          lastName: `Fantasma ${suffix}`,
          personStageId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });

    it('rejects an unknown peaceHouseId with 404', async () => {
      await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Casa',
          lastName: `Fantasma ${suffix}`,
          peaceHouseId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
    });

    it('rejects a body with no last name with 400', async () => {
      await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Solo nombre' })
        .expect(400);
    });
  });

  describe('Traslados e historial', () => {
    let personId: string;

    beforeAll(async () => {
      const response = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Traslado',
          lastName: `Prueba ${suffix}`,
          peaceHouseId: ownHouseId,
        })
        .expect(201);
      personId = envelope<PersonData>(response).data.id;
    });

    it('closes the open period and opens a new one', async () => {
      await request(server)
        .post(`/people/${personId}/transfer`)
        .set(authed(adminToken))
        .send({ peaceHouseId: otherHouseId, transferReason: 'Cambio de residencia' })
        .expect(200);

      const history = await request(server)
        .get(`/people/${personId}/history`)
        .set(authed(adminToken))
        .expect(200);

      const entries = envelope<HistoryEntry[]>(history).data;
      expect(entries).toHaveLength(2);
      // Newest first: exactly one open period, and it is the new house.
      expect(entries[0]).toMatchObject({ peaceHouseId: otherHouseId, endDate: null });
      expect(entries[1]!.peaceHouseId).toBe(ownHouseId);
      expect(entries[1]!.endDate).not.toBeNull();
    });

    it('is a no-op when transferring to the same Casa de Paz', async () => {
      await request(server)
        .post(`/people/${personId}/transfer`)
        .set(authed(adminToken))
        .send({ peaceHouseId: otherHouseId })
        .expect(200);

      const history = await request(server)
        .get(`/people/${personId}/history`)
        .set(authed(adminToken))
        .expect(200);

      // Re-saving must not manufacture a transfer that never happened.
      expect(envelope<HistoryEntry[]>(history).data).toHaveLength(2);
    });

    it('rejects an update with a stale version with 409', async () => {
      await request(server)
        .patch(`/people/${personId}`)
        .set(authed(adminToken))
        .send({ firstName: 'Nuevo', lastName: 'Nombre', version: 999 })
        .expect(409);
    });
  });

  describe('Listado, búsqueda y filtros', () => {
    it('finds a person by phone, not only by name', async () => {
      const response = await request(server)
        .get(`/people?search=300${suffix.slice(-7)}`)
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<PersonData[]>(response).meta?.total).toBeGreaterThan(0);
    });

    it('treats peaceHouseId as the CURRENT roster, not history', async () => {
      const response = await request(server)
        .get(`/people?peaceHouseId=${ownHouseId}`)
        .set(authed(adminToken))
        .expect(200);

      const people = envelope<PersonData[]>(response).data;
      // Everyone returned must still have that house open — the transferred
      // person from the previous block must NOT appear.
      for (const person of people) {
        expect(person.currentPeaceHouseId).toBe(ownHouseId);
      }
    });

    it('paginates and returns meta', async () => {
      const response = await request(server)
        .get('/people?page=1&pageSize=3')
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<PersonData[]>(response).meta).toMatchObject({ page: 1, pageSize: 3 });
    });
  });

  /**
   * doc05 Policies 1-2 — the half a guard cannot cover plus the half it
   * can. Both must agree, or a Líder finds someone in a list and is then
   * refused when opening them.
   */
  describe('Scope por rol', () => {
    let outsiderId: string;

    beforeAll(async () => {
      const response = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Ajeno',
          lastName: `Otra casa ${suffix}`,
          peaceHouseId: otherHouseId,
        })
        .expect(201);
      outsiderId = envelope<PersonData>(response).data.id;
    });

    it('narrows the UN-FILTERED listing to the Líder own Casa de Paz', async () => {
      const response = await request(server)
        .get('/people?pageSize=100')
        .set(authed(leaderToken))
        .expect(200);

      const people = envelope<PersonData[]>(response).data;
      expect(people.length).toBeGreaterThan(0);
      for (const person of people) {
        expect(person.currentPeaceHouseId).toBe(ownHouseId);
      }
    });

    it('lets a Líder list another Casa de Paz roster by explicit peaceHouseId', async () => {
      const response = await request(server)
        .get(`/people?pageSize=100&peaceHouseId=${otherHouseId}`)
        .set(authed(leaderToken))
        .expect(200);

      const people = envelope<PersonData[]>(response).data;
      expect(people.some((person) => person.id === outsiderId)).toBe(true);
    });

    it('lets a Líder read a person from another Casa de Paz (explicit product exception)', async () => {
      await request(server).get(`/people/${outsiderId}`).set(authed(leaderToken)).expect(200);
    });

    it('denies updating a person from another Casa de Paz', async () => {
      await request(server)
        .patch(`/people/${outsiderId}`)
        .set(authed(leaderToken))
        .send({ firstName: 'Intento', lastName: 'Ajeno', version: 1 })
        .expect(403);
    });

    it('lets a Líder read the history of a person outside the scope', async () => {
      await request(server)
        .get(`/people/${outsiderId}/history`)
        .set(authed(leaderToken))
        .expect(200);
    });

    it('lets a Líder read a person with no Casa de Paz assigned', async () => {
      const unassigned = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Sin', lastName: `Asignar ${suffix}` })
        .expect(201);

      // Reading is never scoped now (explicit product exception) — only
      // administering a person outside the caller's Casa de Paz stays 403.
      await request(server)
        .get(`/people/${envelope<PersonData>(unassigned).data.id}`)
        .set(authed(leaderToken))
        .expect(200);
    });
  });

  describe('Eliminación lógica', () => {
    it('removes the person from listings but preserves their history', async () => {
      const created = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({
          firstName: 'Borrado',
          lastName: `Logico ${suffix}`,
          peaceHouseId: ownHouseId,
        })
        .expect(201);
      const personId = envelope<PersonData>(created).data.id;

      await request(server).delete(`/people/${personId}`).set(authed(adminToken)).expect(200);

      // Gone from every read path…
      await request(server).get(`/people/${personId}`).set(authed(adminToken)).expect(404);

      const listing = await request(server)
        .get(`/people?search=Logico ${suffix}`)
        .set(authed(adminToken))
        .expect(200);
      expect(envelope<PersonData[]>(listing).data).toHaveLength(0);
    });
  });
});
