-- DropIndex
DROP INDEX "Meeting_meetingScheduleId_meetingDate_key";

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "isoWeek" INTEGER NOT NULL,
ADD COLUMN     "isoYear" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Meeting_isoYear_isoWeek_idx" ON "Meeting"("isoYear", "isoWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_meetingScheduleId_isoYear_isoWeek_key" ON "Meeting"("meetingScheduleId", "isoYear", "isoWeek");
