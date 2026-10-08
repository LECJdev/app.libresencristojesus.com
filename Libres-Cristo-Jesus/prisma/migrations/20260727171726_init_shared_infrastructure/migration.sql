-- CreateEnum
CREATE TYPE "LeadershipUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateTable
CREATE TABLE "CatRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipUnit" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "photo" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "LeadershipUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeadershipUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipMember" (
    "id" TEXT NOT NULL,
    "leadershipUnitId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "photo" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "LeadershipMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "leadershipUnitId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "device" TEXT,
    "browser" TEXT,
    "ip" TEXT,
    "lastAccess" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatRole_name_key" ON "CatRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipUnit_username_key" ON "LeadershipUnit"("username");

-- CreateIndex
CREATE INDEX "LeadershipUnit_roleId_idx" ON "LeadershipUnit"("roleId");

-- CreateIndex
CREATE INDEX "LeadershipMember_leadershipUnitId_idx" ON "LeadershipMember"("leadershipUnitId");

-- CreateIndex
CREATE INDEX "UserSession_leadershipUnitId_idx" ON "UserSession"("leadershipUnitId");

-- CreateIndex
CREATE INDEX "UserSession_refreshToken_idx" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "LeadershipUnit" ADD CONSTRAINT "LeadershipUnit_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CatRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipMember" ADD CONSTRAINT "LeadershipMember_leadershipUnitId_fkey" FOREIGN KEY ("leadershipUnitId") REFERENCES "LeadershipUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_leadershipUnitId_fkey" FOREIGN KEY ("leadershipUnitId") REFERENCES "LeadershipUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
