/**
 * Follow-up to `cleanup-e2e-districts.ts`: deleting a test District/
 * PeaceHouse tree leaves its `LeadershipUnit` rows behind — nothing points
 * at them any more (the FK was `onDelete: Restrict`, so the delete never
 * touched them), but they still exist with their fake "pastor"/"lider"
 * accounts.
 *
 * A `LeadershipUnit` is only deleted here when BOTH hold:
 *   1. It is fully unreferenced — zero `districtsLed`, `peaceHousesLed`,
 *      `peaceHouseLeadershipHistory`, `kidsAssignments`. A unit that is
 *      merely "not yet assigned to a district" (a real, legitimate state
 *      per doc07 US-005) still has none of these either, so this alone
 *      cannot distinguish test junk from a real pending unit.
 *   2. At least one of its members has a username ending in a long digit
 *      run — every e2e spec under apps/api/test builds usernames as
 *      `{role}.{alias}.${Date.now()}-based suffix}` (e.g.
 *      `lider.e2e.1787889073000697`, `pastores.generales.1787885255398192`).
 *      A real account is never named after a raw epoch timestamp, so this
 *      is what actually separates test debris from a genuine unassigned
 *      unit.
 *
 * DRY RUN BY DEFAULT. Run with `--apply` to actually delete.
 *
 *   pnpm exec tsx apps/api/src/scripts/cleanup-orphan-leadership-units.ts
 *   pnpm exec tsx apps/api/src/scripts/cleanup-orphan-leadership-units.ts --apply
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TEST_USERNAME_SUFFIX = /\d{9,}$/;

const apply = process.argv.includes('--apply');

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const units = await prisma.leadershipUnit.findMany({
      include: {
        members: true,
        _count: {
          select: {
            districtsLed: true,
            peaceHousesLed: true,
            peaceHouseLeadershipHistory: true,
            kidsAssignments: true,
          },
        },
      },
    });

    const targets = units.filter((u) => {
      const unreferenced =
        u._count.districtsLed === 0 &&
        u._count.peaceHousesLed === 0 &&
        u._count.peaceHouseLeadershipHistory === 0 &&
        u._count.kidsAssignments === 0;
      const looksLikeTest = u.members.some((m) => TEST_USERNAME_SUFFIX.test(m.username));
      return unreferenced && looksLikeTest;
    });

    if (targets.length === 0) {
      console.log('No orphaned test LeadershipUnit found — nothing to do.');
      return;
    }

    console.log(`Found ${targets.length} orphaned test LeadershipUnit(s):\n`);
    for (const u of targets) {
      console.log(`- ${u.type} (${u.id}): ${u.members.map((m) => m.username).join(', ')}`);
    }

    if (!apply) {
      console.log('\nDry run — nothing deleted. Re-run with --apply to delete these.');
      return;
    }

    for (const u of targets) {
      await prisma.$transaction(async (tx) => {
        const memberIds = u.members.map((m) => m.id);
        await tx.userSession.deleteMany({ where: { leadershipMemberId: { in: memberIds } } });
        await tx.leadershipMember.deleteMany({ where: { leadershipUnitId: u.id } });
        await tx.leadershipUnit.delete({ where: { id: u.id } });
      });
      console.log(`Deleted ${u.type} (${u.id}).`);
    }

    console.log(`\nDone. Removed ${targets.length} orphaned LeadershipUnit(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
