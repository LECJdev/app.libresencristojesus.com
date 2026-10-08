-- Architecture change: login credentials move from `LeadershipUnit` (the
-- couple's shared account) to `LeadershipMember` (each person gets their
-- own username/password). District/Casa de Paz OWNERSHIP is UNCHANGED —
-- it still points at `LeadershipUnit.id` — only WHO can log in changes.
--
-- No production data exists yet (dev/seed data only), but this migration
-- still backfills real credentials for every existing row rather than
-- wiping them, per the agreed migration strategy:
--   - 1st member of a Unit (oldest by createdAt) inherits the Unit's
--     current username/passwordHash as-is, mustChangePassword = false.
--   - 2nd member (if any) gets a derived username (`{username}2`, trying
--     3, 4, ... until free), the SAME passwordHash as a temporary
--     password, mustChangePassword = true.
-- `UserSession` is a technical/short-lived table (see its own schema
-- comment) — rather than trying to backfill its FK from Unit to Member
-- (which member of the pair actually opened a given session is not
-- recoverable), every existing session is simply invalidated. Everyone
-- logs in again once, which they must do anyway since the credential
-- table itself changed.

-- =========================================================================
-- 1. UserSession: invalidate existing sessions, then move its FK from
--    LeadershipUnit to LeadershipMember.
-- =========================================================================

DELETE FROM "UserSession";

-- DropForeignKey
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_leadershipUnitId_fkey";

-- DropIndex
DROP INDEX "UserSession_leadershipUnitId_idx";

-- AlterTable
ALTER TABLE "UserSession"
  DROP COLUMN "leadershipUnitId",
  ADD COLUMN "leadershipMemberId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "UserSession_leadershipMemberId_idx" ON "UserSession"("leadershipMemberId");

-- AddForeignKey
ALTER TABLE "UserSession"
  ADD CONSTRAINT "UserSession_leadershipMemberId_fkey"
  FOREIGN KEY ("leadershipMemberId") REFERENCES "LeadershipMember"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- 2. LeadershipMember: add the new credential columns NULLABLE first, so
--    they can be backfilled before NOT NULL/UNIQUE is enforced.
-- =========================================================================

ALTER TABLE "LeadershipMember"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "username" TEXT;

-- =========================================================================
-- 3. Backfill: one pass per LeadershipUnit, oldest member first.
-- =========================================================================

DO $$
DECLARE
  unit_row RECORD;
  member_row RECORD;
  member_index INT;
  candidate_username TEXT;
  suffix INT;
BEGIN
  FOR unit_row IN SELECT id, username, "passwordHash" FROM "LeadershipUnit" LOOP
    member_index := 0;

    FOR member_row IN
      SELECT id FROM "LeadershipMember"
      WHERE "leadershipUnitId" = unit_row.id
      ORDER BY "createdAt" ASC, id ASC
    LOOP
      member_index := member_index + 1;

      IF member_index = 1 THEN
        -- First (oldest) member inherits the Unit's account as-is.
        UPDATE "LeadershipMember"
        SET "username" = unit_row.username,
            "passwordHash" = unit_row."passwordHash",
            "mustChangePassword" = false
        WHERE id = member_row.id;
      ELSE
        -- Every subsequent member gets a derived, guaranteed-unique
        -- username and the Unit's password as a TEMPORARY password they
        -- must change on first login.
        suffix := 2;
        candidate_username := unit_row.username || suffix::text;

        WHILE EXISTS (
          SELECT 1 FROM "LeadershipMember" WHERE "username" = candidate_username
        ) LOOP
          suffix := suffix + 1;
          candidate_username := unit_row.username || suffix::text;
        END LOOP;

        UPDATE "LeadershipMember"
        SET "username" = candidate_username,
            "passwordHash" = unit_row."passwordHash",
            "mustChangePassword" = true
        WHERE id = member_row.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =========================================================================
-- 4. Enforce NOT NULL + UNIQUE now that every row has a value.
-- =========================================================================

ALTER TABLE "LeadershipMember" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "LeadershipMember" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "LeadershipMember_username_key" ON "LeadershipMember"("username");

-- =========================================================================
-- 5. Drop the old Unit-level credential columns.
-- =========================================================================

DROP INDEX "LeadershipUnit_username_key";

ALTER TABLE "LeadershipUnit"
  DROP COLUMN "passwordHash",
  DROP COLUMN "username";
