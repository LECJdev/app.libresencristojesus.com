/**
 * One-off cleanup for districts (and everything under them) left behind by
 * E2E test runs that hit the real database instead of a disposable one.
 *
 * The 4 e2e specs that create organizational data (`meetings`,
 * `organization`, `people`, `sync`) all name their districts
 * `Distrito {Suite} {timestampSuffix}` — never a name a real seed or admin
 * would use — so that is the only signal this script trusts. Anything not
 * matching that exact shape is left untouched.
 *
 * DRY RUN BY DEFAULT. Run with `--apply` to actually delete.
 *
 *   pnpm exec tsx apps/api/src/scripts/cleanup-e2e-districts.ts
 *   pnpm exec tsx apps/api/src/scripts/cleanup-e2e-districts.ts --apply
 *
 * Deletes bottom-up through the `Church -> District -> PeaceHouse ->
 * MeetingSchedule -> Meeting -> (Attendance/MeetingUnlock/MeetingPhoto/
 * Offering)` chain, since every one of those FKs is `onDelete: Restrict`
 * (see prisma/schema.prisma) — the DB refuses a parent delete while a
 * child row still points at it. `PeaceHouseLeadershipHistory` and
 * `PersonPeaceHouseHistory` are deleted too (same reason); `SyncOperation`
 * is not touched, its `meetingId` FK is `onDelete: SetNull`.
 *
 * Deliberately leaves `LeadershipUnit`/`LeadershipMember` rows alone even
 * when they end up unreferenced by the deleted tree — those are a
 * separate, user-owned decision (a test-created "pastor" account is not
 * automatically garbage), so the report below just flags them.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TEST_DISTRICT_NAME = /^Distrito (E2E|Reuniones|Personas|Sync) \d+/;

const apply = process.argv.includes('--apply');

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const districts = await prisma.district.findMany({
      include: {
        peaceHouses: {
          include: {
            meetingSchedules: { include: { meetings: true } },
            leadershipHistory: true,
            personHistory: true,
          },
        },
      },
    });

    const targets = districts.filter((d) => TEST_DISTRICT_NAME.test(d.name));

    if (targets.length === 0) {
      console.log('No test districts found — nothing to do.');
      return;
    }

    console.log(`Found ${targets.length} test district(s):\n`);

    for (const d of targets) {
      const meetingCount = d.peaceHouses.reduce(
        (n, ph) => n + ph.meetingSchedules.reduce((m, s) => m + s.meetings.length, 0),
        0,
      );
      console.log(
        `- "${d.name}" (${d.id}): ${d.peaceHouses.length} casa(s) de paz, ` +
          `${meetingCount} reunion(es)`,
      );
      for (const ph of d.peaceHouses) {
        console.log(`    · "${ph.name}" -> leadershipUnitId ${ph.leadershipUnitId}`);
      }
      if (d.leadershipUnitId) {
        console.log(`    (distrito con pastor asignado -> leadershipUnitId ${d.leadershipUnitId})`);
      }
    }

    if (!apply) {
      console.log('\nDry run — nothing deleted. Re-run with --apply to delete these.');
      return;
    }

    for (const d of targets) {
      await prisma.$transaction(async (tx) => {
        for (const ph of d.peaceHouses) {
          for (const schedule of ph.meetingSchedules) {
            for (const meeting of schedule.meetings) {
              await tx.attendance.deleteMany({ where: { meetingId: meeting.id } });
              await tx.meetingUnlock.deleteMany({ where: { meetingId: meeting.id } });
              await tx.meetingPhoto.deleteMany({ where: { meetingId: meeting.id } });
              await tx.offering.deleteMany({ where: { meetingId: meeting.id } });
            }
            await tx.meeting.deleteMany({ where: { meetingScheduleId: schedule.id } });
          }
          await tx.meetingSchedule.deleteMany({ where: { peaceHouseId: ph.id } });
          await tx.peaceHouseLeadershipHistory.deleteMany({ where: { peaceHouseId: ph.id } });
          await tx.personPeaceHouseHistory.deleteMany({ where: { peaceHouseId: ph.id } });
        }
        await tx.peaceHouse.deleteMany({ where: { districtId: d.id } });
        await tx.district.delete({ where: { id: d.id } });
      });
      console.log(`Deleted "${d.name}" and everything under it.`);
    }

    console.log(`\nDone. Removed ${targets.length} test district(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
