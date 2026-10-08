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
 * Registro de la reunión y Ofrendas end to end (Fase 8).
 *
 * DRIVEN AS THE LÍDER WHEREVER POSSIBLE.
 * The Administrador is exempt from scope, so a suite written with its token
 * proves only half of what matters — which is exactly how a 403 for every
 * Líder shipped in Fase 7 and how a cross-house write survived until Fase 8.
 *
 * The locked week is reached by INSERTING a past meeting through Prisma:
 * the endpoints read the clock themselves, and adding a date override to
 * production code would be surface that exists only for tests.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface ThemeData {
  id: string;
  title: string;
  series: string | null;
  version: number;
}

interface ReportData {
  meetingId: string;
  peaceHouseId: string;
  peaceHouseName: string;
  isoYear: number;
  isoWeek: number;
  themeId: string | null;
  themeTitle: string | null;
  themeSeries: string | null;
  preacher: string | null;
  notes: string | null;
  offering: { id: string; amount: number; currency: string; notes: string | null } | null;
  photos: { id: string; path: string; caption: string | null; hidden: boolean }[];
  lock: { editable: boolean; reason: string };
  presentCount: number;
  rosterCount: number;
}

interface OfferingRow {
  id: string;
  meetingId: string;
  peaceHouseId: string;
  amount: number;
  isoWeek: number;
}

interface SummaryData {
  total: number;
  count: number;
  average: number;
  min: number | null;
  max: number | null;
  byWeek: { isoYear: number; isoWeek: number; total: number; count: number }[];
}

describe('Reuniones y Ofrendas (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let adminToken: string;
  let leaderToken: string;
  let pastorToken: string;

  let houseId: string;
  let meetingId: string;
  let themeId: string;

  /** A second Casa de Paz under another Líder — the scope victim. */
  let foreignMeetingId: string;

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
            username: `mtg.${alias}.${suffix}`,
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

    const leaderUnitId = await createUnit('lider', roleId('LEADER'));
    const pastorUnitId = await createUnit('pastor', roleId('DISTRICT_PASTOR'));
    const foreignLeaderUnitId = await createUnit('ajeno', roleId('LEADER'));

    const churches = await request(server)
      .get('/organizations?page=1&pageSize=1')
      .set(authed(adminToken))
      .expect(200);

    const district = await request(server)
      .post('/districts')
      .set(authed(adminToken))
      .send({
        churchId: envelope<IdentifiedRecord[]>(churches).data[0]!.id,
        number: Number(suffix.slice(-6)),
        name: `Distrito Reuniones ${suffix}`,
        leadershipUnitId: pastorUnitId,
      })
      .expect(201);
    const districtId = envelope<IdentifiedRecord>(district).data.id;

    const house = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({
        districtId,
        leadershipUnitId: leaderUnitId,
        name: `Casa Reuniones ${suffix}`,
        meetingDay: 'Jueves',
        meetingHour: '19:00',
      })
      .expect(201);
    houseId = envelope<IdentifiedRecord>(house).data.id;

    await request(server)
      .post('/people')
      .set(authed(adminToken))
      .send({ firstName: 'Asistente', lastName: `Reunión ${suffix}`, peaceHouseId: houseId })
      .expect(201);

    const foreignHouse = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({
        districtId,
        leadershipUnitId: foreignLeaderUnitId,
        name: `Casa Ajena Reuniones ${suffix}`,
        meetingDay: 'Jueves',
        meetingHour: '19:00',
      })
      .expect(201);

    leaderToken = await login(`mtg.lider.${suffix}`, PASSWORD);
    pastorToken = await login(`mtg.pastor.${suffix}`, PASSWORD);

    const sheet = await request(server)
      .post(`/attendance/peace-houses/${houseId}/meetings/current`)
      .set(authed(leaderToken))
      .expect(200);
    meetingId = envelope<{ meetingId: string }>(sheet).data.meetingId;

    const foreignSheet = await request(server)
      .post(
        `/attendance/peace-houses/${envelope<IdentifiedRecord>(foreignHouse).data.id}/meetings/current`,
      )
      .set(authed(adminToken))
      .expect(200);
    foreignMeetingId = envelope<{ meetingId: string }>(foreignSheet).data.meetingId;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  /** doc04 §6: "No escribir el tema manualmente cada semana." */
  describe('Catálogo de temas', () => {
    it('lets a Líder create a theme — the catalog is useless if only admins can fill it', async () => {
      const response = await request(server)
        .post('/sermon-themes')
        .set(authed(leaderToken))
        .send({
          title: `La fe que obra ${suffix}`,
          description: 'Santiago 2',
          series: `Fundamentos ${suffix}`,
        })
        .expect(201);

      themeId = envelope<ThemeData>(response).data.id;
      expect(envelope<ThemeData>(response).data.series).toBe(`Fundamentos ${suffix}`);
    });

    it('rejects a duplicate title regardless of capitalisation', async () => {
      // "Fe", "La Fe" and "LA FE" are three themes to a raw UNIQUE index
      // and one to a person.
      await request(server)
        .post('/sermon-themes')
        .set(authed(leaderToken))
        .send({ title: `la FE que OBRA ${suffix}` })
        .expect(409);
    });

    it('lists the series in use', async () => {
      const response = await request(server)
        .get('/sermon-themes/series')
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<string[]>(response).data).toContain(`Fundamentos ${suffix}`);
    });

    it('finds the theme by a fragment of its description', async () => {
      const response = await request(server)
        .get('/sermon-themes?search=Santiago')
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ThemeData[]>(response).data.some((theme) => theme.id === themeId)).toBe(true);
    });

    it('refuses a stale update (optimistic locking)', async () => {
      await request(server)
        .patch(`/sermon-themes/${themeId}`)
        .set(authed(leaderToken))
        .send({ description: 'Otra cosa', version: 99 })
        .expect(409);
    });

    it('denies a Líder DELETING a theme — it is shared by every Casa de Paz', async () => {
      await request(server)
        .delete(`/sermon-themes/${themeId}`)
        .set(authed(leaderToken))
        .expect(403);
    });
  });

  /** doc01 RF-022/RF-023/RF-024. */
  describe('Reporte de la reunión', () => {
    it('records theme, preacher and notes, resolving the theme for the screen', async () => {
      const response = await request(server)
        .patch(`/meetings/${meetingId}/report`)
        .set(authed(leaderToken))
        .send({ themeId, preacher: 'Pastor invitado', notes: 'Cierre de la serie' })
        .expect(200);

      const report = envelope<ReportData>(response).data;
      expect(report).toMatchObject({
        themeId,
        themeTitle: `La fe que obra ${suffix}`,
        themeSeries: `Fundamentos ${suffix}`,
        preacher: 'Pastor invitado',
        notes: 'Cierre de la serie',
      });
      expect(report.lock).toMatchObject({ editable: true, reason: 'current-week' });
      expect(report.rosterCount).toBe(1);
    });

    it('rejects a theme that does not exist', async () => {
      await request(server)
        .patch(`/meetings/${meetingId}/report`)
        .set(authed(leaderToken))
        .send({ themeId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
    });

    it('denies a Pastor de Distrito from REGISTERING (doc05: supervises, does not fill in)', async () => {
      await request(server)
        .patch(`/meetings/${meetingId}/report`)
        .set(authed(pastorToken))
        .send({ preacher: 'Otro' })
        .expect(403);
    });

    it('still lets a Pastor de Distrito READ the report', async () => {
      await request(server)
        .get(`/meetings/${meetingId}/report`)
        .set(authed(pastorToken))
        .expect(200);
    });
  });

  /** doc02 RN-039..RN-042. */
  describe('Ofrenda', () => {
    let offeringId: string;

    it('refuses a negative amount (RN-041)', async () => {
      await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: -1 })
        .expect(400);
    });

    it('refuses more than two decimal places', async () => {
      await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 1000.555 })
        .expect(400);
    });

    it('registers the offering in COP', async () => {
      const response = await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 250000, notes: 'Ofrenda del jueves' })
        .expect(200);

      const offering = envelope<ReportData>(response).data.offering!;
      offeringId = offering.id;
      expect(offering).toMatchObject({ amount: 250000, currency: 'COP' });
    });

    it('corrects the SAME offering instead of creating a second one (RN-039)', async () => {
      const response = await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 275500.5 })
        .expect(200);

      const offering = envelope<ReportData>(response).data.offering!;
      expect(offering.id).toBe(offeringId);
      expect(offering.amount).toBe(275500.5);
    });

    it('denies a Pastor de Distrito from registering an offering (doc05)', async () => {
      await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(pastorToken))
        .send({ amount: 1 })
        .expect(403);
    });

    it('keeps the row after a delete — RN-042 wants every movement traceable', async () => {
      const response = await request(server)
        .delete(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ReportData>(response).data.offering).toBeNull();

      const row = await prisma.offering.findUnique({ where: { id: offeringId } });
      expect(row).not.toBeNull();
      expect(row!.deletedAt).not.toBeNull();

      // Put it back for the history assertions further down.
      await request(server)
        .put(`/meetings/${meetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 275500.5 })
        .expect(200);
    });
  });

  /** doc01 RF-025, doc02 RN-043/RN-044. */
  describe('Fotografías', () => {
    let photoId: string;

    it('accepts several photographs on one meeting (RN-043)', async () => {
      await request(server)
        .post(`/meetings/${meetingId}/photos`)
        .set(authed(leaderToken))
        .send({ path: `meeting-photo/2026/uno-${suffix}.jpg`, caption: 'Bautizos' })
        .expect(201);

      const response = await request(server)
        .post(`/meetings/${meetingId}/photos`)
        .set(authed(leaderToken))
        .send({ path: `meeting-photo/2026/dos-${suffix}.jpg` })
        .expect(201);

      const photos = envelope<ReportData>(response).data.photos;
      expect(photos).toHaveLength(2);
      photoId = photos[0]!.id;
    });

    it('hides a photograph WITHOUT removing it (RN-044)', async () => {
      const response = await request(server)
        .patch(`/meetings/${meetingId}/photos/${photoId}`)
        .set(authed(leaderToken))
        .send({ hidden: true })
        .expect(200);

      const photos = envelope<ReportData>(response).data.photos;
      // Still two: hiding takes it out of the gallery, not out of the record.
      expect(photos).toHaveLength(2);
      expect(photos.find((photo) => photo.id === photoId)!.hidden).toBe(true);
    });

    it('restores a hidden photograph', async () => {
      const response = await request(server)
        .patch(`/meetings/${meetingId}/photos/${photoId}`)
        .set(authed(leaderToken))
        .send({ hidden: false })
        .expect(200);

      expect(
        envelope<ReportData>(response).data.photos.find((photo) => photo.id === photoId)!.hidden,
      ).toBe(false);
    });

    it('rejects a photograph id that belongs to another meeting', async () => {
      await request(server)
        .patch(`/meetings/${meetingId}/photos/00000000-0000-4000-8000-000000000000`)
        .set(authed(leaderToken))
        .send({ caption: 'x' })
        .expect(404);
    });
  });

  /**
   * The row-level check `ScopeGuard` could not perform until
   * `ScopeResourceType.MEETING` existed: every route here identifies the
   * week by `meetingId`, and a route whose identifier the guard cannot
   * resolve has no row-level check at all.
   */
  describe('Alcance por fila', () => {
    it('denies a Líder READING the report of a Casa de Paz that is not theirs', async () => {
      await request(server)
        .get(`/meetings/${foreignMeetingId}/report`)
        .set(authed(leaderToken))
        .expect(403);
    });

    it('denies a Líder registering the offering of a foreign Casa de Paz', async () => {
      await request(server)
        .put(`/meetings/${foreignMeetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 999 })
        .expect(403);
    });

    it('denies a Líder uploading a photograph to a foreign meeting', async () => {
      await request(server)
        .post(`/meetings/${foreignMeetingId}/photos`)
        .set(authed(leaderToken))
        .send({ path: 'intruso.jpg' })
        .expect(403);
    });
  });

  /** One meeting, one lock — the same rule the attendance sheet obeys. */
  describe('El candado semanal alcanza a todo el reporte', () => {
    let pastMeetingId: string;

    beforeAll(async () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 14);

      const schedule = await prisma.meetingSchedule.findFirstOrThrow({
        where: { peaceHouseId: houseId, active: true },
        select: { id: true },
      });

      const isoYearWeek = await prisma.$queryRawUnsafe<{ y: number; w: number }[]>(
        `SELECT EXTRACT(ISOYEAR FROM $1::timestamp)::int AS y, EXTRACT(WEEK FROM $1::timestamp)::int AS w`,
        past,
      );

      const meeting = await prisma.meeting.create({
        data: {
          meetingScheduleId: schedule.id,
          meetingDate: past,
          isoYear: isoYearWeek[0]!.y,
          isoWeek: isoYearWeek[0]!.w,
        },
      });
      pastMeetingId = meeting.id;
    });

    it('shows the report as locked for the Líder', async () => {
      const response = await request(server)
        .get(`/meetings/${pastMeetingId}/report`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ReportData>(response).data.lock).toMatchObject({
        editable: false,
        reason: 'past-week',
      });
    });

    it('blocks the theme, the offering and the photographs alike', async () => {
      // If these three disagreed, a church would end up with a meeting whose
      // attendance is closed while its offering is still open.
      await request(server)
        .patch(`/meetings/${pastMeetingId}/report`)
        .set(authed(leaderToken))
        .send({ preacher: 'Tarde' })
        .expect(403);

      await request(server)
        .put(`/meetings/${pastMeetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 1000 })
        .expect(403);

      await request(server)
        .post(`/meetings/${pastMeetingId}/photos`)
        .set(authed(leaderToken))
        .send({ path: 'tarde.jpg' })
        .expect(403);
    });

    it('lets the Líder write again after the Pastor de Distrito reopens the week', async () => {
      await request(server)
        .post(`/attendance/meetings/${pastMeetingId}/unlock`)
        .set(authed(pastorToken))
        .send({ reason: 'El líder reportó la ofrenda fuera de plazo' })
        .expect(200);

      const response = await request(server)
        .put(`/meetings/${pastMeetingId}/offering`)
        .set(authed(leaderToken))
        .send({ amount: 120000 })
        .expect(200);

      const report = envelope<ReportData>(response).data;
      expect(report.offering!.amount).toBe(120000);
      expect(report.lock).toMatchObject({ editable: true, reason: 'unlocked' });
    });
  });

  describe('Historial y estadísticas', () => {
    it('shows a Líder ONLY the offerings of their own Casa de Paz', async () => {
      const response = await request(server)
        .get('/offerings?page=1&pageSize=50')
        .set(authed(leaderToken))
        .expect(200);

      const rows = envelope<OfferingRow[]>(response).data;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.peaceHouseId === houseId)).toBe(true);
    });

    it('lets a Pastor de Distrito see the offerings of their district', async () => {
      // doc05: they may not register one, but they supervise the figures.
      const response = await request(server)
        .get('/offerings?page=1&pageSize=50')
        .set(authed(pastorToken))
        .expect(200);

      expect(
        envelope<OfferingRow[]>(response).data.some((row) => row.peaceHouseId === houseId),
      ).toBe(true);
    });

    it('aggregates over the whole filter, not over the page on screen', async () => {
      const response = await request(server)
        .get(`/offerings/summary?peaceHouseId=${houseId}`)
        .set(authed(leaderToken))
        .expect(200);

      const summary = envelope<SummaryData>(response).data;
      // 275500.50 (current week) + 120000 (the reopened one).
      expect(summary.count).toBe(2);
      expect(summary.total).toBeCloseTo(395500.5, 2);
      expect(summary.min).toBe(120000);
      expect(summary.max).toBeCloseTo(275500.5, 2);
      expect(summary.byWeek).toHaveLength(2);
    });

    it('scopes the summary exactly like the list', async () => {
      const response = await request(server)
        .get('/offerings/summary')
        .set(authed(leaderToken))
        .expect(200);

      // Without the same filter, a Líder would read a total covering houses
      // whose rows the list refuses to show them.
      expect(envelope<SummaryData>(response).data.count).toBe(2);
    });
  });
});
