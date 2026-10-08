-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'PENDIENTE', 'REPORTADA', 'VALIDADA', 'CERRADA');

-- CreateTable
CREATE TABLE "CatPersonStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "CatPersonStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "document" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "photo" TEXT,
    "notes" TEXT,
    "personStageId" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonPeaceHouseHistory" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "peaceHouseId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PersonPeaceHouseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSchedule" (
    "id" TEXT NOT NULL,
    "peaceHouseId" TEXT NOT NULL,
    "meetingDay" TEXT NOT NULL,
    "meetingHour" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MeetingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "meetingScheduleId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "notes" TEXT,
    "validatedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "arrivalTime" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingUnlock" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "unlockedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatPersonStage_name_key" ON "CatPersonStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Person_document_key" ON "Person"("document");

-- CreateIndex
CREATE INDEX "Person_phone_idx" ON "Person"("phone");

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_personStageId_idx" ON "Person"("personStageId");

-- CreateIndex
CREATE INDEX "PersonPeaceHouseHistory_personId_idx" ON "PersonPeaceHouseHistory"("personId");

-- CreateIndex
CREATE INDEX "PersonPeaceHouseHistory_peaceHouseId_idx" ON "PersonPeaceHouseHistory"("peaceHouseId");

-- CreateIndex
CREATE INDEX "PersonPeaceHouseHistory_startDate_idx" ON "PersonPeaceHouseHistory"("startDate");

-- CreateIndex
CREATE INDEX "MeetingSchedule_peaceHouseId_idx" ON "MeetingSchedule"("peaceHouseId");

-- CreateIndex
CREATE INDEX "MeetingSchedule_active_idx" ON "MeetingSchedule"("active");

-- CreateIndex
CREATE INDEX "Meeting_meetingDate_idx" ON "Meeting"("meetingDate");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_meetingScheduleId_meetingDate_key" ON "Meeting"("meetingScheduleId", "meetingDate");

-- CreateIndex
CREATE INDEX "Attendance_meetingId_idx" ON "Attendance"("meetingId");

-- CreateIndex
CREATE INDEX "Attendance_personId_idx" ON "Attendance"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_meetingId_personId_key" ON "Attendance"("meetingId", "personId");

-- CreateIndex
CREATE INDEX "MeetingUnlock_meetingId_idx" ON "MeetingUnlock"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingUnlock_unlockedAt_idx" ON "MeetingUnlock"("unlockedAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_personStageId_fkey" FOREIGN KEY ("personStageId") REFERENCES "CatPersonStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPeaceHouseHistory" ADD CONSTRAINT "PersonPeaceHouseHistory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPeaceHouseHistory" ADD CONSTRAINT "PersonPeaceHouseHistory_peaceHouseId_fkey" FOREIGN KEY ("peaceHouseId") REFERENCES "PeaceHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSchedule" ADD CONSTRAINT "MeetingSchedule_peaceHouseId_fkey" FOREIGN KEY ("peaceHouseId") REFERENCES "PeaceHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_meetingScheduleId_fkey" FOREIGN KEY ("meetingScheduleId") REFERENCES "MeetingSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingUnlock" ADD CONSTRAINT "MeetingUnlock_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
