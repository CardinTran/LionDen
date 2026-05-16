-- CreateTable
CREATE TABLE "BotGuildConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'LionDen is in maintenance mode. Please try again later.',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActiveLionSpawn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lionSpeciesId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "messageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "spawnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "caughtByUserId" TEXT,
    "caughtByDisplayName" TEXT,
    "caughtAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActiveLionSpawn_lionSpeciesId_fkey" FOREIGN KEY ("lionSpeciesId") REFERENCES "LionSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ActiveLionSpawn" ("caughtAt", "caughtByDisplayName", "caughtByUserId", "channelId", "createdAt", "expiresAt", "guildId", "id", "lionSpeciesId", "messageId", "spawnedAt", "status", "updatedAt") SELECT "caughtAt", "caughtByDisplayName", "caughtByUserId", "channelId", "createdAt", "expiresAt", "guildId", "id", "lionSpeciesId", "messageId", "spawnedAt", "status", "updatedAt" FROM "ActiveLionSpawn";
DROP TABLE "ActiveLionSpawn";
ALTER TABLE "new_ActiveLionSpawn" RENAME TO "ActiveLionSpawn";
CREATE INDEX "ActiveLionSpawn_guildId_status_idx" ON "ActiveLionSpawn"("guildId", "status");
CREATE INDEX "ActiveLionSpawn_guildId_channelId_status_idx" ON "ActiveLionSpawn"("guildId", "channelId", "status");
CREATE TABLE "new_UserLion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerDisplayName" TEXT NOT NULL DEFAULT '',
    "lionSpeciesId" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "lastTrainedAt" DATETIME,
    "lastBattledAt" DATETIME,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLion_lionSpeciesId_fkey" FOREIGN KEY ("lionSpeciesId") REFERENCES "LionSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserLion" ("acquiredAt", "createdAt", "experience", "guildId", "id", "lastBattledAt", "lastTrainedAt", "level", "lionSpeciesId", "nickname", "sourceReferenceId", "sourceType", "updatedAt", "userId") SELECT "acquiredAt", "createdAt", "experience", "guildId", "id", "lastBattledAt", "lastTrainedAt", "level", "lionSpeciesId", "nickname", "sourceReferenceId", "sourceType", "updatedAt", "userId" FROM "UserLion";
DROP TABLE "UserLion";
ALTER TABLE "new_UserLion" RENAME TO "UserLion";
CREATE INDEX "UserLion_guildId_userId_idx" ON "UserLion"("guildId", "userId");
CREATE INDEX "UserLion_lionSpeciesId_idx" ON "UserLion"("lionSpeciesId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BotGuildConfig_guildId_key" ON "BotGuildConfig"("guildId");
