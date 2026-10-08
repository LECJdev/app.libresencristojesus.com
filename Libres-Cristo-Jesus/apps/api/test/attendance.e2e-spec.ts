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
 * Asistencia end to end (doc11 RN-407/RN-503/RN-504).
 *
 * HOW THE LOCK IS EXERCISED
 * The endpoints read the clock internally, so a past week cannot be reached
 * over HTTP. The suite instead INSERTS a meeting belonging to an earlier ISO
 * week straight through Prisma, then drives the real endpoints against it.
 * Testing the calendar rule any other way would mean adding a date override
 * to production code — extra surface that exists only for tests, and one
 * more thing that can be switched on by accident.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface ChecklistData {
  meetingId: string;
  isoYear: number;
  isoWeek: number;
  presentCount: number;
  rows: { personId: string; present: boolean; comments: string | null }[];
  lock: { editable: boolean; reason: string; unlockedUntil: string | null };
}

describe('Asistencia (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let adminToken: string;
  let leaderToken: string;
  let pastorToken: string;

  let houseId: string;
  let scheduleId: string;
  const personIds: string[] = [];

  /** A second Casa de Paz, led by somebody else — the victim of a cross-house write. */
  let foreignHouseId: string;
  let foreignPersonId: string;

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
            username: `att.${alias}.${suffix}`,
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
        name: `Distrito Asistencia ${suffix}`,
        // The pastor must lead the district for the scope checks to resolve.
        leadershipUnitId: pastorUnitId,
      })
      .expect(201);

    const house = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({
        districtId: envelope<IdentifiedRecord>(district).data.id,
        leadershipUnitId: leaderUnitId,
        name: `Casa Asistencia ${suffix}`,
        meetingDay: 'Jueves',
        meetingHour: '19:00',
      })
      .expect(201);
    houseId = envelope<IdentifiedRecord>(house).data.id;

    for (const name of ['Ana', 'Luis', 'Sara']) {
      const person = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: name, lastName: `Asist ${suffix}`, peaceHouseId: houseId })
        .expect(201);
      personIds.push(envelope<IdentifiedRecord>(person).data.id);
    }

    // A second Casa de Paz under a DIFFERENT leader, in the same district.
    // RN-019 forbids one unit leading two houses, so it needs its own.
    const foreignLeaderUnitId = await createUnit('ajeno', roleId('LEADER'));
    const foreignHouse = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({
        districtId: envelope<IdentifiedRecord>(district).data.id,
        leadershipUnitId: foreignLeaderUnitId,
        name: `Casa Ajena ${suffix}`,
        meetingDay: 'Jueves',
        meetingHour: '19:00',
      })
      .expect(201);
    foreignHouseId = envelope<IdentifiedRecord>(foreignHouse).data.id;

    const foreignPerson = await request(server)
      .post('/people')
      .set(authed(adminToken))
      .send({ firstName: 'Ajena', lastName: `Casa ${suffix}`, peaceHouseId: foreignHouseId })
      .expect(201);
    foreignPersonId = envelope<IdentifiedRecord>(foreignPerson).data.id;

    leaderToken = await login(`att.lider.${suffix}`, PASSWORD);
    pastorToken = await login(`att.pastor.${suffix}`, PASSWORD);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Apertura de la semana vigente', () => {
    it('lets the Líder open (and lazily create) the meeting of their OWN Casa de Paz', async () => {
      // The regression this guards: with the id in the request body instead
      // of the path, ScopeGuard found nothing to resolve and answered 403
      // "Missing resource identifier" — for the module's primary user.
      const response = await request(server)
        .post(`/attendance/peace-houses/${houseId}/meetings/current`)
        .set(authed(leaderToken))
        .expect(200);

      const checklist = envelope<ChecklistData>(response).data;
      scheduleId = checklist.meetingId;
      expect(checklist.rows).toHaveLength(3);
      expect(checklist.lock).toMatchObject({ editable: true, reason: 'current-week' });
    });

    it('is idempotent — a second call returns the same meeting', async () => {
      const response = await request(server)
        .post(`/attendance/peace-houses/${houseId}/meetings/current`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ChecklistData>(response).data.meetingId).toBe(scheduleId);
    });

    it('denies a Líder opening a Casa de Paz that is not theirs', async () => {
      const otherHouses = await request(server)
        .get('/peace-houses?pageSize=50')
        .set(authed(adminToken))
        .expect(200);
      const outsider = envelope<{ id: string }[]>(otherHouses).data.find(
        (house) => house.id !== houseId,
      );

      if (outsider) {
        await request(server)
          .post(`/attendance/peace-houses/${outsider.id}/meetings/current`)
          .set(authed(leaderToken))
          .expect(403);
      }
    });
  });

  describe('Checklist', () => {
    it('marks one person present and records the comment', async () => {
      const response = await request(server)
        .patch(`/attendance/meetings/${scheduleId}/people/${personIds[0]!}`)
        .set(authed(leaderToken))
        .send({ present: true, comments: 'Llegó tarde' })
        .expect(200);

      const checklist = envelope<ChecklistData>(response).data;
      expect(checklist.presentCount).toBe(1);
      expect(checklist.rows.find((row) => row.personId === personIds[0])?.comments).toBe(
        'Llegó tarde',
      );
    });

    it('marks everyone with one call', async () => {
      const response = await request(server)
        .post(`/attendance/meetings/${scheduleId}/mark-all`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(3);
    });

    it('unmarks everyone with the same endpoint', async () => {
      const response = await request(server)
        .post(`/attendance/meetings/${scheduleId}/mark-all`)
        .set(authed(leaderToken))
        .send({ present: false })
        .expect(200);

      expect(envelope<ChecklistData>(response).data.presentCount).toBe(0);
    });

    it('rejects marking someone from another Casa de Paz', async () => {
      const outsider = await request(server)
        .post('/people')
        .set(authed(adminToken))
        .send({ firstName: 'Ajeno', lastName: `Asist ${suffix}` })
        .expect(201);

      await request(server)
        .patch(
          `/attendance/meetings/${scheduleId}/people/${envelope<IdentifiedRecord>(outsider).data.id}`,
        )
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(400);
    });

    it('denies a Pastor de Distrito from REGISTERING attendance (doc05)', async () => {
      // The matrix gives "Registrar Asistencia" to Administrador and Líder
      // only — the pastor supervises and reopens, never records.
      await request(server)
        .patch(`/attendance/meetings/${scheduleId}/people/${personIds[0]!}`)
        .set(authed(pastorToken))
        .send({ present: true })
        .expect(403);
    });

    it('still lets a Pastor de Distrito READ the sheet', async () => {
      await request(server)
        .get(`/attendance/meetings/${scheduleId}`)
        .set(authed(pastorToken))
        .expect(200);
    });

    /**
     * CROSS-HOUSE WRITE — the hole this suite did not cover.
     *
     * Opening a meeting is scoped by `peaceHouseId` in the path, so a Líder
     * cannot open a house that is not theirs. But every route AFTER that
     * takes a `meetingId`, and a meeting id was not something `ScopeGuard`
     * could resolve — so an authenticated Líder could mark, mark-all and
     * report on ANY Casa de Paz in the country by passing its meeting id.
     *
     * The service checked that the person belonged to the MEETING's roster,
     * which is true for every person of the victim house. Nothing checked
     * that the meeting belonged to the CALLER.
     */
    it('denies a Líder writing on a meeting of a Casa de Paz that is not theirs', async () => {
      const foreign = await request(server)
        .post(`/attendance/peace-houses/${foreignHouseId}/meetings/current`)
        .set(authed(adminToken))
        .expect(200);
      const foreignMeeting = envelope<ChecklistData>(foreign).data;

      await request(server)
        .patch(`/attendance/meetings/${foreignMeeting.meetingId}/people/${foreignPersonId}`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(403);

      await request(server)
        .post(`/attendance/meetings/${foreignMeeting.meetingId}/mark-all`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(403);
    });

    it('denies a Líder even READING a foreign meeting sheet', async () => {
      const foreignMeeting = await prisma.meeting.findFirstOrThrow({
        where: { meetingSchedule: { peaceHouseId: foreignHouseId } },
        select: { id: true },
      });

      await request(server)
        .get(`/attendance/meetings/${foreignMeeting.id}`)
        .set(authed(leaderToken))
        .expect(403);
    });
  });

  /** doc11 RN-407 / RN-503 — the calendar rule and its exception. */
  describe('Bloqueo semanal y desbloqueo', () => {
    let pastMeetingId: string;

    beforeAll(async () => {
      // A meeting two ISO weeks in the past. Inserted directly because the
      // endpoints read the clock themselves.
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

    it('locks a past week for the Líder', async () => {
      const response = await request(server)
        .get(`/attendance/meetings/${pastMeetingId}`)
        .set(authed(leaderToken))
        .expect(200);

      expect(envelope<ChecklistData>(response).data.lock).toMatchObject({
        editable: false,
        reason: 'past-week',
      });
    });

    it('refuses a write from the Líder on a locked week', async () => {
      await request(server)
        .patch(`/attendance/meetings/${pastMeetingId}/people/${personIds[0]!}`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(403);
    });

    it('does NOT lock the same meeting for a Pastor de Distrito', async () => {
      const response = await request(server)
        .get(`/attendance/meetings/${pastMeetingId}`)
        .set(authed(pastorToken))
        .expect(200);

      // They are the ones who can reopen — blocking them would be circular.
      expect(envelope<ChecklistData>(response).data.lock).toMatchObject({
        editable: true,
        reason: 'role-exempt',
      });
    });

    it('denies a Líder reopening their own closed week', async () => {
      await request(server)
        .post(`/attendance/meetings/${pastMeetingId}/unlock`)
        .set(authed(leaderToken))
        .send({ reason: 'me olvidé' })
        .expect(403);
    });

    it('rejects a reopening with no stated reason', async () => {
      await request(server)
        .post(`/attendance/meetings/${pastMeetingId}/unlock`)
        .set(authed(pastorToken))
        .send({})
        .expect(400);
    });

    it('lets the Pastor de Distrito reopen it, and the Líder write again', async () => {
      const unlocked = await request(server)
        .post(`/attendance/meetings/${pastMeetingId}/unlock`)
        .set(authed(pastorToken))
        .send({ reason: 'Reporte tardío autorizado' })
        .expect(200);

      // The pastor's own view says 'role-exempt', not 'unlocked': for them
      // the calendar never applied, so there is no exception to report.
      // `unlockedUntil` is information for the Líder, and only they see it.
      expect(envelope<ChecklistData>(unlocked).data.lock.reason).toBe('role-exempt');

      // The whole point of the exception: the Líder can now record.
      const marked = await request(server)
        .patch(`/attendance/meetings/${pastMeetingId}/people/${personIds[0]!}`)
        .set(authed(leaderToken))
        .send({ present: true })
        .expect(200);

      const leaderView = envelope<ChecklistData>(marked).data.lock;
      expect(leaderView.reason).toBe('unlocked');
      expect(leaderView.unlockedUntil).not.toBeNull();
    });

    it('records who reopened, why, and until when', async () => {
      const unlocks = await prisma.meetingUnlock.findMany({
        where: { meetingId: pastMeetingId },
        orderBy: { unlockedAt: 'desc' },
      });

      expect(unlocks.length).toBeGreaterThan(0);
      const latest = unlocks[0]!;
      expect(latest.reason).toBe('Reporte tardío autorizado');
      expect(latest.unlockedBy).toEqual(expect.any(String));
      expect(latest.expiresAt).toBeInstanceOf(Date);

      // Approved rule 3: exactly 7 calendar days.
      const days = Math.round(
        (latest.expiresAt!.getTime() - latest.unlockedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      expect(days).toBe(7);
    });

    it('rejects reopening a meeting that is not locked', async () => {
      await request(server)
        .post(`/attendance/meetings/${scheduleId}/unlock`)
        .set(authed(pastorToken))
        .send({ reason: 'por si acaso' })
        .expect(400);
    });

    it('leaves an audit trail for the reopening and the writes that followed', async () => {
      const entries = await prisma.auditLog.findMany({
        where: { entity: { in: ['Meeting', 'Attendance'] } },
        select: { entity: true, action: true },
      });

      const signatures = new Set(entries.map((entry) => `${entry.entity}/${entry.action}`));
      expect(signatures.has('Meeting/UNLOCK')).toBe(true);
      expect(signatures.has('Attendance/MARK')).toBe(true);
    });
  });
});
