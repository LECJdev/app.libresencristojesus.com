-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "preacher" TEXT,
ADD COLUMN     "themeId" TEXT;

-- CreateTable
CREATE TABLE "SermonTheme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "series" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SermonTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offering" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "notes" TEXT,
    "registeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingPhoto" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hiddenAt" TIMESTAMP(3),
    "hiddenBy" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MeetingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SermonTheme_title_key" ON "SermonTheme"("title");

-- CreateIndex
CREATE INDEX "SermonTheme_series_idx" ON "SermonTheme"("series");

-- CreateIndex
CREATE INDEX "SermonTheme_status_idx" ON "SermonTheme"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Offering_meetingId_key" ON "Offering"("meetingId");

-- CreateIndex
CREATE INDEX "Offering_meetingId_idx" ON "Offering"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingPhoto_meetingId_idx" ON "MeetingPhoto"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingPhoto_hiddenAt_idx" ON "MeetingPhoto"("hiddenAt");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "SermonTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingPhoto" ADD CONSTRAINT "MeetingPhoto_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RN-041: "No se permitirá registrar valores negativos."
--
-- Written by hand because Prisma cannot declare a CHECK constraint in the
-- schema. It belongs here anyway: a rule that only lives in a DTO is not a
-- constraint, it is a convention — and the first script, seed or manual fix
-- that writes straight to the table would breach it in silence.
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_amount_non_negative" CHECK ("amount" >= 0);
