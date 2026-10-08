-- CreateEnum
CREATE TYPE "SyncOperationStatus" AS ENUM ('APPLIED', 'REJECTED', 'CONFLICT');

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "meetingId" TEXT,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdOfflineAt" TIMESTAMP(3) NOT NULL,
    "operationType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncOperationStatus" NOT NULL,
    "resultMessage" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncOperation_operationId_key" ON "SyncOperation"("operationId");

-- CreateIndex
CREATE INDEX "SyncOperation_userId_idx" ON "SyncOperation"("userId");

-- CreateIndex
CREATE INDEX "SyncOperation_meetingId_idx" ON "SyncOperation"("meetingId");

-- CreateIndex
CREATE INDEX "SyncOperation_status_idx" ON "SyncOperation"("status");

-- CreateIndex
CREATE INDEX "SyncOperation_createdOfflineAt_idx" ON "SyncOperation"("createdOfflineAt");

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
