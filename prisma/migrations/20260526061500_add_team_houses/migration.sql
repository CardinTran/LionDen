-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "houseKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HouseMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseMembership_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HousePointLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HousePointLedger_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "House_guildId_houseKey_key" ON "House"("guildId", "houseKey");

-- CreateIndex
CREATE INDEX "House_guildId_idx" ON "House"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseMembership_guildId_userId_key" ON "HouseMembership"("guildId", "userId");

-- CreateIndex
CREATE INDEX "HouseMembership_guildId_houseId_idx" ON "HouseMembership"("guildId", "houseId");

-- CreateIndex
CREATE UNIQUE INDEX "HousePointLedger_guildId_sourceType_sourceId_key" ON "HousePointLedger"("guildId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "HousePointLedger_guildId_houseId_createdAt_idx" ON "HousePointLedger"("guildId", "houseId", "createdAt");

-- CreateIndex
CREATE INDEX "HousePointLedger_guildId_userId_createdAt_idx" ON "HousePointLedger"("guildId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "HousePointLedger_guildId_sourceType_createdAt_idx" ON "HousePointLedger"("guildId", "sourceType", "createdAt");
