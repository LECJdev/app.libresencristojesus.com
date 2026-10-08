-- CreateEnum
CREATE TYPE "KidsConsentStatus" AS ENUM ('PENDING_AUTHORIZATION', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KidsAssignmentRole" AS ENUM ('LEADER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "KidsSchool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsUserAssignment" (
    "id" TEXT NOT NULL,
    "kidsSchoolId" TEXT NOT NULL,
    "leadershipUnitId" TEXT NOT NULL,
    "role" "KidsAssignmentRole" NOT NULL,
    "canCreateChild" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsUserAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsChild" (
    "id" TEXT NOT NULL,
    "kidsSchoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "photo" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsGuardian" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsChildGuardian" (
    "id" TEXT NOT NULL,
    "kidsChildId" TEXT NOT NULL,
    "kidsGuardianId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsChildGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsConsent" (
    "id" TEXT NOT NULL,
    "kidsChildId" TEXT NOT NULL,
    "status" "KidsConsentStatus" NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
    "documentPath" TEXT,
    "signedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsMeeting" (
    "id" TEXT NOT NULL,
    "kidsSchoolId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsAttendance" (
    "id" TEXT NOT NULL,
    "kidsMeetingId" TEXT NOT NULL,
    "kidsChildId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KidsAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KidsSchool_name_key" ON "KidsSchool"("name");

-- CreateIndex
CREATE INDEX "KidsUserAssignment_kidsSchoolId_idx" ON "KidsUserAssignment"("kidsSchoolId");

-- CreateIndex
CREATE INDEX "KidsUserAssignment_leadershipUnitId_idx" ON "KidsUserAssignment"("leadershipUnitId");

-- CreateIndex
CREATE INDEX "KidsUserAssignment_kidsSchoolId_role_endDate_idx" ON "KidsUserAssignment"("kidsSchoolId", "role", "endDate");

-- CreateIndex
CREATE INDEX "KidsChild_kidsSchoolId_idx" ON "KidsChild"("kidsSchoolId");

-- CreateIndex
CREATE INDEX "KidsChild_lastName_firstName_idx" ON "KidsChild"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "KidsChildGuardian_kidsGuardianId_idx" ON "KidsChildGuardian"("kidsGuardianId");

-- CreateIndex
CREATE UNIQUE INDEX "KidsChildGuardian_kidsChildId_kidsGuardianId_key" ON "KidsChildGuardian"("kidsChildId", "kidsGuardianId");

-- CreateIndex
CREATE UNIQUE INDEX "KidsConsent_kidsChildId_key" ON "KidsConsent"("kidsChildId");

-- CreateIndex
CREATE INDEX "KidsConsent_status_idx" ON "KidsConsent"("status");

-- CreateIndex
CREATE INDEX "KidsMeeting_kidsSchoolId_idx" ON "KidsMeeting"("kidsSchoolId");

-- CreateIndex
CREATE INDEX "KidsMeeting_isoYear_isoWeek_idx" ON "KidsMeeting"("isoYear", "isoWeek");

-- CreateIndex
CREATE UNIQUE INDEX "KidsMeeting_kidsSchoolId_isoYear_isoWeek_key" ON "KidsMeeting"("kidsSchoolId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "KidsAttendance_kidsMeetingId_idx" ON "KidsAttendance"("kidsMeetingId");

-- CreateIndex
CREATE INDEX "KidsAttendance_kidsChildId_idx" ON "KidsAttendance"("kidsChildId");

-- CreateIndex
CREATE UNIQUE INDEX "KidsAttendance_kidsMeetingId_kidsChildId_key" ON "KidsAttendance"("kidsMeetingId", "kidsChildId");

-- AddForeignKey
ALTER TABLE "KidsUserAssignment" ADD CONSTRAINT "KidsUserAssignment_kidsSchoolId_fkey" FOREIGN KEY ("kidsSchoolId") REFERENCES "KidsSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsUserAssignment" ADD CONSTRAINT "KidsUserAssignment_leadershipUnitId_fkey" FOREIGN KEY ("leadershipUnitId") REFERENCES "LeadershipUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsChild" ADD CONSTRAINT "KidsChild_kidsSchoolId_fkey" FOREIGN KEY ("kidsSchoolId") REFERENCES "KidsSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsChildGuardian" ADD CONSTRAINT "KidsChildGuardian_kidsChildId_fkey" FOREIGN KEY ("kidsChildId") REFERENCES "KidsChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsChildGuardian" ADD CONSTRAINT "KidsChildGuardian_kidsGuardianId_fkey" FOREIGN KEY ("kidsGuardianId") REFERENCES "KidsGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsConsent" ADD CONSTRAINT "KidsConsent_kidsChildId_fkey" FOREIGN KEY ("kidsChildId") REFERENCES "KidsChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsMeeting" ADD CONSTRAINT "KidsMeeting_kidsSchoolId_fkey" FOREIGN KEY ("kidsSchoolId") REFERENCES "KidsSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsAttendance" ADD CONSTRAINT "KidsAttendance_kidsMeetingId_fkey" FOREIGN KEY ("kidsMeetingId") REFERENCES "KidsMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsAttendance" ADD CONSTRAINT "KidsAttendance_kidsChildId_fkey" FOREIGN KEY ("kidsChildId") REFERENCES "KidsChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Escuela Kids: partial unique indexes (RN definitiva del dueño del proyecto)
--
-- Prisma's schema DSL cannot express a partial unique index (WHERE clause),
-- so these two are hand-written here rather than declared in schema.prisma.
--
-- 1. Never two ACTIVE leaders on the same KidsSchool at once. "Active" means
--    endDate IS NULL (open assignment period) AND deletedAt IS NULL (not
--    soft-deleted) — a closed or removed assignment does not count. This is
--    the concurrency protection the leader-change flow relies on: two
--    simultaneous "assign leader" requests race, one inserts, the other gets
--    a unique violation.
CREATE UNIQUE INDEX "kids_user_assignment_one_active_leader"
  ON "KidsUserAssignment" ("kidsSchoolId")
  WHERE "role" = 'LEADER' AND "endDate" IS NULL AND "deletedAt" IS NULL;

-- 2. The same LeadershipUnit cannot hold two simultaneously ACTIVE
--    assignments (leader or assistant) to the same KidsSchool — prevents a
--    duplicate "add assistant" race producing two open rows for one person.
CREATE UNIQUE INDEX "kids_user_assignment_one_active_per_person"
  ON "KidsUserAssignment" ("kidsSchoolId", "leadershipUnitId")
  WHERE "endDate" IS NULL AND "deletedAt" IS NULL;
