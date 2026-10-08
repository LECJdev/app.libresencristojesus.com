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

interface TreeData {
  scoped: boolean;
  generalPastors: unknown[];
  districts: unknown[];
}

interface HistoryEntry {
  leadershipUnitId: string;
  endDate: string | null;
}

interface PeaceHouseData extends IdentifiedRecord {
  latitude: number | null;
}

interface DistrictData extends IdentifiedRecord {
  createdBy: string | null;
  version: number;
}

interface RoleData {
  id: string;
  roleName: string;
}

interface SettingData extends IdentifiedRecord {
  value: string;
  status: string;
}

/**
 * Organización end to end: Iglesia, Distritos, Casas de Paz, Geografía,
 * Configuración, permisos, scope por rol y auditoría.
 *
 * DATA HYGIENE
 * Every record this suite creates carries a unique suffix, so repeated
 * runs against the same development database never collide — and no
 * assertion depends on a global count, which would make the suite fail
 * simply because someone else added a district.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };

interface Ids {
  churchId: string;
  districtId: string;
  leaderUnitId: string;
  departmentId: string;
  municipalityId: string;
  otherDepartmentId: string;
}

describe('Organización (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let adminToken: string;
  let leaderToken: string;
  const suffix = uniqueSuffix();
  const ids = {} as Ids;

  /** Bearer header for a token — a plain helper, deliberately not async. */
  function authed(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  beforeAll(async () => {
    app = await createE2EApp();
    server = app.getHttpServer() as App;

    const login = await request(server).post('/auth/login').send(ADMIN).expect(200);
    adminToken = envelope<LoginData>(login).data.accessToken;

    // The single Church the seeder creates.
    const churches = await request(server)
      .get('/organizations?page=1&pageSize=1')
      .set(authed(adminToken))
      .expect(200);
    ids.churchId = envelope<IdentifiedRecord[]>(churches).data[0]!.id;

    const departments = await request(server)
      .get('/geography/departments?search=Antioquia')
      .set(authed(adminToken))
      .expect(200);
    ids.departmentId = envelope<IdentifiedRecord[]>(departments).data[0]!.id;

    const municipalities = await request(server)
      .get(`/geography/municipalities?departmentId=${ids.departmentId}&pageSize=1`)
      .set(authed(adminToken))
      .expect(200);
    ids.municipalityId = envelope<IdentifiedRecord[]>(municipalities).data[0]!.id;

    const otherDepartments = await request(server)
      .get('/geography/departments?search=Boyac')
      .set(authed(adminToken))
      .expect(200);
    ids.otherDepartmentId = envelope<IdentifiedRecord[]>(otherDepartments).data[0]!.id;
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Geografía', () => {
    it('serves the seeded catalogs from PostgreSQL', async () => {
      const response = await request(server)
        .get('/geography/departments?pageSize=100')
        .set(authed(adminToken))
        .expect(200);

      // 32 departments + Bogotá D.C.
      expect(envelope<unknown[]>(response).meta?.total).toBe(33);
    });

    it('rejects a departmentId that is not a UUID with 400', async () => {
      await request(server)
        .get('/geography/municipalities?departmentId=not-a-uuid')
        .set(authed(adminToken))
        .expect(400);
    });
  });

  describe('Distritos', () => {
    it('creates a district and stamps createdBy with the actor', async () => {
      const response = await request(server)
        .post('/districts')
        .set(authed(adminToken))
        .send({
          churchId: ids.churchId,
          number: Number(suffix.slice(-6)),
          name: `Distrito E2E ${suffix}`,
          description: 'Creado por la suite e2e',
        })
        .expect(201);

      const district = envelope<DistrictData>(response).data;
      ids.districtId = district.id;
      expect(district.createdBy).toEqual(expect.any(String));
      expect(district.version).toBe(1);
    });

    it('rejects a duplicate (churchId, number) with 409', async () => {
      const number = Number(suffix.slice(-6));
      await request(server)
        .post('/districts')
        .set(authed(adminToken))
        .send({ churchId: ids.churchId, number, name: `Otro ${suffix}` })
        .expect(409);
    });

    it('rejects an update whose version is stale with 409', async () => {
      await request(server)
        .patch(`/districts/${ids.districtId}`)
        .set(authed(adminToken))
        .send({ name: 'Cambio con versión vieja', version: 999 })
        .expect(409);
    });

    it('paginates and returns meta', async () => {
      const response = await request(server)
        .get('/districts?page=1&pageSize=5')
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<unknown[]>(response).meta).toMatchObject({ page: 1, pageSize: 5 });
    });
  });

  describe('Casas de Paz', () => {
    beforeAll(async () => {
      const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
      const leaderRoleId = envelope<RoleData[]>(roles).data.find(
        (role) => role.roleName === 'LEADER',
      )!.id;

      const unit = await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Lider',
          roleId: leaderRoleId,
          members: [
            {
              firstName: 'Lider',
              lastName: `E2E ${suffix}`,
              gender: 'M',
              username: `lider.e2e.${suffix}`,
              password: 'Lider123*',
            },
          ],
        })
        .expect(201);
      ids.leaderUnitId = envelope<IdentifiedRecord>(unit).data.id;

      const leaderLogin = await request(server)
        .post('/auth/login')
        .send({ username: `lider.e2e.${suffix}`, password: 'Lider123*' })
        .expect(200);
      leaderToken = envelope<LoginData>(leaderLogin).data.accessToken;
    }, 30_000);

    it('rejects a municipality from another department with 400', async () => {
      // The foreign keys accept both ids individually; only the explicit
      // coherence check catches that they do not belong together.
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: ids.leaderUnitId,
          name: `Casa Incoherente ${suffix}`,
          departmentId: ids.otherDepartmentId,
          municipalityId: ids.municipalityId,
        })
        .expect(400);
    });

    it('rejects a municipality sent without its department with 400', async () => {
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: ids.leaderUnitId,
          name: `Casa Sin Depto ${suffix}`,
          municipalityId: ids.municipalityId,
        })
        .expect(400);
    });

    it('creates a coherent Casa de Paz and opens its leadership history', async () => {
      const response = await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: ids.leaderUnitId,
          name: `Casa E2E ${suffix}`,
          code: `CP-E2E-${suffix}`,
          departmentId: ids.departmentId,
          municipalityId: ids.municipalityId,
          meetingDay: 'Jueves',
          meetingHour: '19:00',
          latitude: 6.244203,
          longitude: -75.581215,
        })
        .expect(201);

      const created = envelope<PeaceHouseData>(response).data;
      const peaceHouseId = created.id;
      expect(created.latitude).toBeCloseTo(6.244203, 5);

      const history = await request(server)
        .get(`/peace-houses/${peaceHouseId}/leadership-history`)
        .set(authed(adminToken))
        .expect(200);

      const entries = envelope<HistoryEntry[]>(history).data;
      expect(entries).toHaveLength(1);
      // The opening period stays open: an endDate here would record a
      // leadership that ended the moment it began.
      expect(entries[0]).toMatchObject({
        leadershipUnitId: ids.leaderUnitId,
        endDate: null,
      });
    });

    it('rejects a duplicate code with 409', async () => {
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: ids.leaderUnitId,
          name: `Casa Duplicada ${suffix}`,
          code: `CP-E2E-${suffix}`,
        })
        .expect(409);
    });

    it('rejects an invalid meetingHour with 400', async () => {
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: ids.leaderUnitId,
          name: `Casa Hora Mala ${suffix}`,
          meetingHour: '25:99',
        })
        .expect(400);
    });
  });

  describe('Permisos y scope por rol', () => {
    it('denies a Líder the modules reserved for administrators', async () => {
      for (const path of ['/users', '/roles', '/permissions']) {
        await request(server).get(path).set(authed(leaderToken)).expect(403);
      }
    });

    it('denies a Líder the creation of a district', async () => {
      await request(server)
        .post('/districts')
        .set(authed(leaderToken))
        .send({ churchId: ids.churchId, number: 1, name: 'No permitido' })
        .expect(403);
    });

    it('shows a Líder the whole organigrama, same as an admin (doc06 §4)', async () => {
      const asAdmin = await request(server)
        .get('/organizations/tree')
        .set(authed(adminToken))
        .expect(200);

      const asLeader = await request(server)
        .get('/organizations/tree')
        .set(authed(leaderToken))
        .expect(200);

      const adminTree = envelope<TreeData>(asAdmin).data;
      const leaderTree = envelope<TreeData>(asLeader).data;
      expect(adminTree.scoped).toBe(false);
      expect(leaderTree.scoped).toBe(false);
      expect(leaderTree.generalPastors.length).toEqual(adminTree.generalPastors.length);
      expect(leaderTree.districts.length).toEqual(adminTree.districts.length);
    });

    it('lets every role read the geographic catalogs', async () => {
      await request(server)
        .get('/geography/departments?pageSize=5')
        .set(authed(leaderToken))
        .expect(200);
    });

    it('lets a Líder view another Casa de Paz in full, but not modify it (doc06 §4 vs doc05 Policy 1)', async () => {
      const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
      const leaderRoleId = envelope<RoleData[]>(roles).data.find(
        (role) => role.roleName === 'LEADER',
      )!.id;

      const foreignLeaderUnit = await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Lider',
          roleId: leaderRoleId,
          members: [
            {
              firstName: 'Foraneo',
              lastName: `E2E ${suffix}`,
              gender: 'F',
              username: `lider.foraneo.${suffix}`,
              password: 'Lider123*',
            },
          ],
        })
        .expect(201);

      const foreignHouse = await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: envelope<IdentifiedRecord>(foreignLeaderUnit).data.id,
          name: `Casa Foránea ${suffix}`,
        })
        .expect(201);
      const foreignHouseId = envelope<IdentifiedRecord>(foreignHouse).data.id;

      // Reading is unrestricted, same as the organigrama (doc06 §4).
      await request(server)
        .get(`/peace-houses/${foreignHouseId}`)
        .set(authed(leaderToken))
        .expect(200);
      await request(server)
        .get(`/peace-houses/${foreignHouseId}/leadership-history`)
        .set(authed(leaderToken))
        .expect(200);

      // Administering stays scoped to their own Casa de Paz (doc05 Policy 1).
      await request(server)
        .patch(`/peace-houses/${foreignHouseId}`)
        .set(authed(leaderToken))
        .send({ name: 'No debería poder' })
        .expect(403);
    });
  });

  /**
   * doc06 §2: two people, ONE account. The rule has no database
   * expression, so it is only real if it is exercised.
   */
  describe('Pastores Generales — cuenta única', () => {
    let generalPastorRoleId: string;

    beforeAll(async () => {
      const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
      generalPastorRoleId = envelope<RoleData[]>(roles).data.find(
        (role) => role.roleName === 'GENERAL_PASTOR',
      )!.id;
    });

    it('refuses a second Pastores Generales account with 409', async () => {
      // The seeded database may or may not already hold one, so the first
      // call establishes the state this test depends on.
      const first = await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Pastor General',
          roleId: generalPastorRoleId,
          members: [
            {
              firstName: 'Pastor',
              lastName: `E2E ${suffix}`,
              gender: 'M',
              username: `pastores.generales.${suffix}`,
              password: 'Pastor123*',
            },
          ],
        });

      expect([201, 409]).toContain(first.status);

      // Whatever happened above, a further attempt must be refused.
      await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Pastor General',
          roleId: generalPastorRoleId,
          members: [
            {
              firstName: 'Otro',
              lastName: `E2E ${suffix}`,
              gender: 'M',
              username: `pastores.generales.dup.${suffix}`,
              password: 'Pastor123*',
            },
          ],
        })
        .expect(409);
    });

    it('still allows creating accounts for other roles', async () => {
      const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
      const leaderRoleId = envelope<RoleData[]>(roles).data.find(
        (role) => role.roleName === 'LEADER',
      )!.id;

      await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Lider',
          roleId: leaderRoleId,
          members: [
            {
              firstName: 'Otro',
              lastName: `Lider ${suffix}`,
              gender: 'M',
              username: `lider.extra.${suffix}`,
              password: 'Lider123*',
            },
          ],
        })
        .expect(201);
    });
  });

  /**
   * RN-019: a Leadership Unit may lead only ONE active Casa de Paz, and
   * every reassignment must leave a complete history behind (doc06 §10).
   */
  describe('Líderes — restricciones e historial', () => {
    let secondLeaderId: string;
    /** Leads nothing — the couple the house is handed over to. */
    let idleLeaderId: string;
    let houseId: string;

    async function createLeader(alias: string): Promise<string> {
      const roles = await request(server).get('/roles').set(authed(adminToken)).expect(200);
      const leaderRoleId = envelope<RoleData[]>(roles).data.find(
        (role) => role.roleName === 'LEADER',
      )!.id;

      const unit = await request(server)
        .post('/users')
        .set(authed(adminToken))
        .send({
          type: 'Lider',
          roleId: leaderRoleId,
          members: [
            {
              firstName: 'Lider',
              lastName: `${alias} ${suffix}`,
              gender: 'M',
              username: `lider.${alias}.${suffix}`,
              password: 'Lider123*',
            },
            {
              firstName: 'Lidera',
              lastName: `${alias} ${suffix}`,
              gender: 'F',
              username: `lidera.${alias}.${suffix}`,
              password: 'Lider123*',
            },
          ],
        })
        .expect(201);

      return envelope<IdentifiedRecord>(unit).data.id;
    }

    beforeAll(async () => {
      secondLeaderId = await createLeader('titular');
      // A DIFFERENT, unassigned couple: RN-019 forbids handing the house to
      // one that already leads another, so reusing an existing leader here
      // would test the wrong rule.
      idleLeaderId = await createLeader('relevo');

      const house = await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: secondLeaderId,
          name: `Casa Liderazgo ${suffix}`,
        })
        .expect(201);
      houseId = envelope<IdentifiedRecord>(house).data.id;
    }, 30_000);

    it('stores both members of the couple on one shared unit, each with their own login', async () => {
      const response = await request(server)
        .get(`/users/${secondLeaderId}`)
        .set(authed(adminToken))
        .expect(200);

      const unit = envelope<{ members: { username: string }[] }>(response).data;
      expect(unit.members).toHaveLength(2);
      // One LeadershipUnit, never two — doc06 §3 — but each member keeps
      // independent login credentials since the schema migration.
      expect(unit.members.map((member) => member.username).sort()).toEqual(
        [`lider.titular.${suffix}`, `lidera.titular.${suffix}`].sort(),
      );
    });

    it('refuses to give the same couple a second active Casa de Paz (RN-019)', async () => {
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: secondLeaderId,
          name: `Casa Segunda ${suffix}`,
        })
        .expect(409);
    });

    it('closes the previous period and opens a new one when leadership changes', async () => {
      const before = await request(server)
        .get(`/peace-houses/${houseId}`)
        .set(authed(adminToken))
        .expect(200);
      const version = envelope<{ version: number }>(before).data.version;

      await request(server)
        .patch(`/peace-houses/${houseId}`)
        .set(authed(adminToken))
        .send({ leadershipUnitId: idleLeaderId, version })
        .expect(200);

      const history = await request(server)
        .get(`/peace-houses/${houseId}/leadership-history`)
        .set(authed(adminToken))
        .expect(200);

      const entries = envelope<HistoryEntry[]>(history).data;
      expect(entries).toHaveLength(2);
      // Newest first: exactly one open period, and it is the new couple.
      expect(entries[0]).toMatchObject({ leadershipUnitId: idleLeaderId, endDate: null });
      // The previous period was closed, not deleted — history is never lost.
      expect(entries[1]!.leadershipUnitId).toBe(secondLeaderId);
      expect(entries[1]!.endDate).not.toBeNull();
    });

    it('frees the former couple to lead another Casa de Paz', async () => {
      await request(server)
        .post('/peace-houses')
        .set(authed(adminToken))
        .send({
          districtId: ids.districtId,
          leadershipUnitId: secondLeaderId,
          name: `Casa Reasignada ${suffix}`,
        })
        .expect(201);
    });
  });

  /** doc06 §12: Distrito, Casa, Líder, Pastor, Municipio, Departamento. */
  describe('Búsqueda global', () => {
    interface SearchData {
      districts: { title: string }[];
      peaceHouses: { title: string }[];
      leaderships: { title: string }[];
      municipalities: { title: string }[];
      departments: { title: string }[];
      total: number;
      scoped: boolean;
    }

    it('rejects a query shorter than two characters with 400', async () => {
      await request(server).get('/organizations/search?q=a').set(authed(adminToken)).expect(400);
    });

    it('finds a district by name', async () => {
      const response = await request(server)
        .get(`/organizations/search?q=${encodeURIComponent(`Distrito E2E ${suffix}`)}`)
        .set(authed(adminToken))
        .expect(200);

      const data = envelope<SearchData>(response).data;
      expect(data.districts.length).toBeGreaterThan(0);
      expect(data.total).toBeGreaterThan(0);
    });

    it('finds a Casa de Paz by its code, not only by name', async () => {
      const response = await request(server)
        .get(`/organizations/search?q=${encodeURIComponent(`CP-E2E-${suffix}`)}`)
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<SearchData>(response).data.peaceHouses.length).toBeGreaterThan(0);
    });

    it('finds a couple by a member name, not only by username', async () => {
      const response = await request(server)
        .get('/organizations/search?q=Lidera')
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<SearchData>(response).data.leaderships.length).toBeGreaterThan(0);
    });

    it('finds geography', async () => {
      const response = await request(server)
        .get('/organizations/search?q=Medell')
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<SearchData>(response).data.municipalities.length).toBeGreaterThan(0);
    });

    it('does not narrow results for a Líder (doc06 §4)', async () => {
      const response = await request(server)
        .get('/organizations/search?q=Antioquia')
        .set(authed(leaderToken))
        .expect(200);

      const data = envelope<SearchData>(response).data;
      expect(data.scoped).toBe(false);
      expect(data.departments.length).toBeGreaterThan(0);
    });

    it('lets a Líder find other couples, same as an admin', async () => {
      const asAdmin = await request(server)
        .get('/organizations/search?q=Lider')
        .set(authed(adminToken))
        .expect(200);

      const asLeader = await request(server)
        .get('/organizations/search?q=Lider')
        .set(authed(leaderToken))
        .expect(200);

      const adminData = envelope<SearchData>(asAdmin).data;
      const leaderData = envelope<SearchData>(asLeader).data;
      expect(leaderData.leaderships.length).toEqual(adminData.leaderships.length);
    });

    it('caps each group independently', async () => {
      const response = await request(server)
        .get('/organizations/search?q=Casa&limit=2')
        .set(authed(adminToken))
        .expect(200);

      expect(envelope<SearchData>(response).data.peaceHouses.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Archivos', () => {
    // A minimal but real PNG signature — enough for the MIME allowlist,
    // and byte-comparable on download.
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
    let storedPath: string;

    it('stores an allowed image and returns a path, not a URL', async () => {
      const response = await request(server)
        .post('/files/upload')
        .set(authed(adminToken))
        .field('category', 'leadership-photo')
        .attach('file', pngBytes, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);

      const stored = envelope<{ path: string; size: number; mimeType: string }>(response).data;
      storedPath = stored.path;

      expect(stored.size).toBe(pngBytes.byteLength);
      // A URL would bake in a host, so rows written in staging would point
      // at staging forever.
      expect(stored.path).not.toMatch(/^https?:\/\//);
      expect(stored.path).toContain('leadership-photo/');
      // The client filename must not survive — an attacker controls it.
      expect(stored.path).not.toContain('foto.png');
    });

    it('returns the same bytes on download, with sniffing disabled', async () => {
      const response = await request(server)
        .get(`/files/${storedPath}`)
        .set(authed(adminToken))
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.from(response.body as Buffer)).toEqual(pngBytes);
    });

    it('rejects a MIME type outside the category allowlist', async () => {
      await request(server)
        .post('/files/upload')
        .set(authed(adminToken))
        .field('category', 'leadership-photo')
        .attach('file', Buffer.from('no soy imagen'), {
          filename: 'x.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('rejects an unknown category', async () => {
      await request(server)
        .post('/files/upload')
        .set(authed(adminToken))
        .field('category', 'inventada')
        .attach('file', pngBytes, { filename: 'foto.png', contentType: 'image/png' })
        .expect(400);
    });

    it('rejects a request with no file attached', async () => {
      await request(server)
        .post('/files/upload')
        .set(authed(adminToken))
        .field('category', 'leadership-photo')
        .expect(400);
    });

    it('refuses to escape the storage root', async () => {
      await request(server)
        .get('/files/../../../../../../etc/passwd')
        .set(authed(adminToken))
        .expect(404);
    });

    it('requires authentication to download', async () => {
      await request(server).get(`/files/${storedPath}`).expect(401);
    });
  });

  describe('Configuración', () => {
    const key = 'e2e.sample_setting';

    it('creates and updates a setting through the same upsert route', async () => {
      const created = await request(server)
        .put(`/settings/${key}`)
        .set(authed(adminToken))
        .send({ value: 'primero', description: 'Creado por e2e' })
        .expect(200);
      const createdSetting = envelope<SettingData>(created).data;
      expect(createdSetting.value).toBe('primero');

      const updated = await request(server)
        .put(`/settings/${key}`)
        .set(authed(adminToken))
        .send({ value: 'segundo' })
        .expect(200);
      const updatedSetting = envelope<SettingData>(updated).data;
      expect(updatedSetting.value).toBe('segundo');
      // Same row, not a second one.
      expect(updatedSetting.id).toBe(createdSetting.id);
    });

    it('rejects a key that breaks the naming rule with 400', async () => {
      await request(server)
        .put('/settings/Not-A-Valid-Key')
        .set(authed(adminToken))
        .send({ value: 'x' })
        .expect(400);
    });

    it('denies a Líder any write to configuration', async () => {
      await request(server)
        .put(`/settings/${key}`)
        .set(authed(leaderToken))
        .send({ value: 'no permitido' })
        .expect(403);
    });

    it('revives a soft-deleted key instead of failing on its unique constraint', async () => {
      await request(server).delete(`/settings/${key}`).set(authed(adminToken)).expect(200);

      const revived = await request(server)
        .put(`/settings/${key}`)
        .set(authed(adminToken))
        .send({ value: 'revivido' })
        .expect(200);

      expect(envelope<SettingData>(revived).data.status).toBe('ACTIVE');
    });

    it('cleans up after itself', async () => {
      await request(server).delete(`/settings/${key}`).set(authed(adminToken)).expect(200);
    });
  });
});
