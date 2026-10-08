import { randomUUID } from 'node:crypto';
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
 * Sincronización offline end to end (Fase 10, RN-1202/RN-1203).
 *
 * WHY NO 403 CASE
 * `sync:push` is granted to all four `RoleName`s (see `prisma/seed.ts`
 * `SYNC_PERMISSIONS`): the endpoint only opens the door, and each domain
 * service re-checks its own permission/scope per row exactly as it does
 * for an online request. There is no seeded role without `sync:push` to
 * exercise a 403 against — the module deliberately has none.
 *
 * WHY `ATTENDANCE_MARK` PROVES `createdOfflineAt` DRIVES THE DATA
 * `AttendanceService.upsertAttendance` sets `arrivalTime: present ? now :
 * null`, and `SyncService` passes `createdOfflineAt` as that `now`. Reading
 * `arrivalTime` back and comparing it to `createdOfflineAt` (never to the
 * moment the HTTP request actually arrived) is the one assertion that would
 * fail if sync silently reverted to using the server clock.
 *
 * REQUIREMENTS: running PostgreSQL/Redis and a seeded database.
 */

const ADMIN = { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*' };
const PASSWORD = 'Lider123*';

interface RoleData {
  id: string;
  roleName: string;
}

interface SyncResultData {
  operationId: string;
  status: 'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT';
  message: string;
}

interface SyncBatchResultData {
  results: SyncResultData[];
  applied: number;
  duplicated: number;
  rejected: number;
  conflicted: number;
}

describe('Sincronización offline (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let adminToken: string;
  let leaderToken: string;

  let houseId: string;
  let meetingId: string;
  let personId: string;

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
            username: `sync.${alias}.${suffix}`,
            password: PASSWORD,
          },
        ],
      })
      .expect(201);
    return envelope<IdentifiedRecord>(unit).data.id;
  }

  async function push(token: string, operations: Record<string, unknown>[]) {
    const response = await request(server)
      .post('/sync/operations')
      .set(authed(token))
      .send({ operations })
      .expect(200);
    return envelope<SyncBatchResultData>(response).data;
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
        name: `Distrito Sync ${suffix}`,
        leadershipUnitId: pastorUnitId,
      })
      .expect(201);

    const house = await request(server)
      .post('/peace-houses')
      .set(authed(adminToken))
      .send({
        districtId: envelope<IdentifiedRecord>(district).data.id,
        leadershipUnitId: leaderUnitId,
        name: `Casa Sync ${suffix}`,
        meetingDay: 'Jueves',
        meetingHour: '19:00',
      })
      .expect(201);
    houseId = envelope<IdentifiedRecord>(house).data.id;

    const person = await request(server)
      .post('/people')
      .set(authed(adminToken))
      .send({ firstName: 'Sync', lastName: `Offline ${suffix}`, peaceHouseId: houseId })
      .expect(201);
    personId = envelope<IdentifiedRecord>(person).data.id;

    leaderToken = await login(`sync.lider.${suffix}`, PASSWORD);

    // The meeting itself is opened online — sync applies to the OPERATIONS
    // made without connection, not to the existence of the meeting row.
    const sheet = await request(server)
      .post(`/attendance/peace-houses/${houseId}/meetings/current`)
      .set(authed(leaderToken))
      .expect(200);
    meetingId = envelope<{ meetingId: string }>(sheet).data.meetingId;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(server)
      .post('/sync/operations')
      .send({
        operations: [
          {
            operationId: randomUUID(),
            deviceId: `device-${suffix}`,
            createdOfflineAt: new Date().toISOString(),
            operationType: 'ATTENDANCE_MARK',
            meetingId,
            payload: { personId, present: true },
          },
        ],
      })
      .expect(401);
  });

  describe('Aplicación', () => {
    // An hour in the past — well within the meeting's own ISO week, and far
    // enough from "now" that a value copied from the server clock instead
    // of the payload would fail the arrivalTime assertion below.
    const createdOfflineAt = new Date(Date.now() - 60 * 60 * 1000);
    const operationId = randomUUID();

    it('applies a valid ATTENDANCE_MARK operation, using createdOfflineAt as the domain "now"', async () => {
      const result = await push(leaderToken, [
        {
          operationId,
          deviceId: `device-${suffix}`,
          createdOfflineAt: createdOfflineAt.toISOString(),
          operationType: 'ATTENDANCE_MARK',
          meetingId,
          payload: { personId, present: true, comments: 'Marcado sin conexión' },
        },
      ]);

      expect(result.results).toEqual([expect.objectContaining({ operationId, status: 'APPLIED' })]);
      expect(result.applied).toBe(1);

      const attendance = await prisma.attendance.findUnique({
        where: { meetingId_personId: { meetingId, personId } },
      });
      expect(attendance).not.toBeNull();
      expect(attendance!.present).toBe(true);
      expect(attendance!.comments).toBe('Marcado sin conexión');
      // The field the server's own clock would have gotten wrong.
      expect(attendance!.arrivalTime?.getTime()).toBe(createdOfflineAt.getTime());
    });

    it('reports a resend of the same operationId as DUPLICATE and does not reapply it', async () => {
      const result = await push(leaderToken, [
        {
          operationId,
          deviceId: `device-${suffix}`,
          createdOfflineAt: createdOfflineAt.toISOString(),
          operationType: 'ATTENDANCE_MARK',
          meetingId,
          // Deliberately different payload: if this were re-applied instead
          // of short-circuited, `present` would flip to false.
          payload: { personId, present: false },
        },
      ]);

      expect(result.results).toEqual([
        expect.objectContaining({ operationId, status: 'DUPLICATE' }),
      ]);
      expect(result.duplicated).toBe(1);

      const attendance = await prisma.attendance.findUnique({
        where: { meetingId_personId: { meetingId, personId } },
      });
      expect(attendance!.present).toBe(true);

      const stored = await prisma.syncOperation.findMany({ where: { operationId } });
      expect(stored).toHaveLength(1);
    });

    it('registers an OFFERING_UPSERT and then CONFLICTs a different amount for the same meeting', async () => {
      const firstOperationId = randomUUID();
      const applied = await push(leaderToken, [
        {
          operationId: firstOperationId,
          deviceId: `device-${suffix}`,
          createdOfflineAt: createdOfflineAt.toISOString(),
          operationType: 'OFFERING_UPSERT',
          meetingId,
          payload: { amount: 100000 },
        },
      ]);
      expect(applied.results).toEqual([
        expect.objectContaining({ operationId: firstOperationId, status: 'APPLIED' }),
      ]);

      const secondOperationId = randomUUID();
      const conflicted = await push(leaderToken, [
        {
          operationId: secondOperationId,
          deviceId: `device-${suffix}`,
          createdOfflineAt: new Date(createdOfflineAt.getTime() + 1000).toISOString(),
          operationType: 'OFFERING_UPSERT',
          meetingId,
          // A second phone counted a different amount for the same meeting.
          payload: { amount: 150000 },
        },
      ]);
      expect(conflicted.results).toEqual([
        expect.objectContaining({ operationId: secondOperationId, status: 'CONFLICT' }),
      ]);
      expect(conflicted.conflicted).toBe(1);

      const offering = await prisma.offering.findFirst({ where: { meetingId, deletedAt: null } });
      expect(offering).not.toBeNull();
      // Neither the first amount nor the app crashed — it stayed at 100000.
      expect(offering!.amount.toString()).toBe('100000');
    });
  });
});
