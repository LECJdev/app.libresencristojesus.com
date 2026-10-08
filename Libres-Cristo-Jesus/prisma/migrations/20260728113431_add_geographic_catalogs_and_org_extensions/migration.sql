-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "District" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "PeaceHouse" ADD COLUMN     "code" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- CreateTable
CREATE TABLE "CatDepartment" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "codeDane" TEXT,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CatDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatMunicipality" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "codeDane" TEXT,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CatMunicipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeaceHouseLeadershipHistory" (
    "id" TEXT NOT NULL,
    "peaceHouseId" TEXT NOT NULL,
    "leadershipUnitId" TEXT NOT NULL,
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

    CONSTRAINT "PeaceHouseLeadershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatDepartment_codeDane_key" ON "CatDepartment"("codeDane");

-- CreateIndex
CREATE INDEX "CatDepartment_name_idx" ON "CatDepartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatDepartment_sourceName_externalId_key" ON "CatDepartment"("sourceName", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CatMunicipality_codeDane_key" ON "CatMunicipality"("codeDane");

-- CreateIndex
CREATE INDEX "CatMunicipality_departmentId_idx" ON "CatMunicipality"("departmentId");

-- CreateIndex
CREATE INDEX "CatMunicipality_name_idx" ON "CatMunicipality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatMunicipality_sourceName_externalId_key" ON "CatMunicipality"("sourceName", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "PeaceHouseLeadershipHistory_peaceHouseId_idx" ON "PeaceHouseLeadershipHistory"("peaceHouseId");

-- CreateIndex
CREATE INDEX "PeaceHouseLeadershipHistory_leadershipUnitId_idx" ON "PeaceHouseLeadershipHistory"("leadershipUnitId");

-- CreateIndex
CREATE INDEX "PeaceHouseLeadershipHistory_startDate_idx" ON "PeaceHouseLeadershipHistory"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "PeaceHouse_code_key" ON "PeaceHouse"("code");

-- AddForeignKey
ALTER TABLE "CatMunicipality" ADD CONSTRAINT "CatMunicipality_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CatDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeaceHouse" ADD CONSTRAINT "PeaceHouse_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CatDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeaceHouse" ADD CONSTRAINT "PeaceHouse_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "CatMunicipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeaceHouseLeadershipHistory" ADD CONSTRAINT "PeaceHouseLeadershipHistory_peaceHouseId_fkey" FOREIGN KEY ("peaceHouseId") REFERENCES "PeaceHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeaceHouseLeadershipHistory" ADD CONSTRAINT "PeaceHouseLeadershipHistory_leadershipUnitId_fkey" FOREIGN KEY ("leadershipUnitId") REFERENCES "LeadershipUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
