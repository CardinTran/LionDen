-- CreateTable
CREATE TABLE "HouseBadgeDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserHouseBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "houseId" TEXT,
    "weekKey" TEXT,
    "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "UserHouseBadge_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseBadgeDefinition_badgeKey_key" ON "HouseBadgeDefinition"("badgeKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserHouseBadge_guildId_userId_badgeKey_weekKey_key" ON "UserHouseBadge"("guildId", "userId", "badgeKey", "weekKey");

-- CreateIndex
CREATE INDEX "UserHouseBadge_guildId_userId_idx" ON "UserHouseBadge"("guildId", "userId");

-- CreateIndex
CREATE INDEX "UserHouseBadge_guildId_houseId_idx" ON "UserHouseBadge"("guildId", "houseId");

-- CreateIndex
CREATE INDEX "UserHouseBadge_guildId_weekKey_idx" ON "UserHouseBadge"("guildId", "weekKey");
