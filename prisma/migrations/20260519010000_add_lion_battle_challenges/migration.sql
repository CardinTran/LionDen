-- CreateTable
CREATE TABLE "LionBattleChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "challengerDisplayName" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "opponentDisplayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "battleRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LionBattleChallenge_guildId_channelId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "channelId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "LionBattleChallenge_guildId_challengerUserId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "challengerUserId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "LionBattleChallenge_guildId_opponentUserId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "opponentUserId", "status", "expiresAt");
