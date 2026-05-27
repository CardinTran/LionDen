-- CreateTable
CREATE TABLE "HouseRecapConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weekday" INTEGER NOT NULL DEFAULT 0,
    "hour" INTEGER NOT NULL DEFAULT 18,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HouseRecapPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseRecapConfig_guildId_key" ON "HouseRecapConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseRecapPost_guildId_weekKey_key" ON "HouseRecapPost"("guildId", "weekKey");

-- CreateIndex
CREATE INDEX "HouseRecapPost_guildId_postedAt_idx" ON "HouseRecapPost"("guildId", "postedAt");
