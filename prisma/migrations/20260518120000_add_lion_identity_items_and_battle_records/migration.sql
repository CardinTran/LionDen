-- CreateTable
CREATE TABLE "LionBattleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "challengerDisplayName" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "opponentDisplayName" TEXT NOT NULL,
    "winnerUserId" TEXT NOT NULL,
    "winnerDisplayName" TEXT NOT NULL,
    "loserUserId" TEXT NOT NULL,
    "loserDisplayName" TEXT NOT NULL,
    "winnerSide" TEXT NOT NULL,
    "challengerTeamLionIds" TEXT NOT NULL,
    "opponentTeamLionIds" TEXT NOT NULL,
    "participantLionIds" TEXT NOT NULL,
    "mvpLionId" TEXT,
    "mvpLionName" TEXT,
    "roundsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserLion_guildId_level_idx" ON "UserLion"("guildId", "level");

-- CreateIndex
CREATE INDEX "LionChannelEffect_guildId_channelId_effectType_idx" ON "LionChannelEffect"("guildId", "channelId", "effectType");

-- CreateIndex
CREATE INDEX "LionBattleRecord_guildId_createdAt_idx" ON "LionBattleRecord"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "LionBattleRecord_guildId_challengerUserId_createdAt_idx" ON "LionBattleRecord"("guildId", "challengerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "LionBattleRecord_guildId_opponentUserId_createdAt_idx" ON "LionBattleRecord"("guildId", "opponentUserId", "createdAt");

-- CreateIndex
CREATE INDEX "LionBattleRecord_guildId_winnerUserId_createdAt_idx" ON "LionBattleRecord"("guildId", "winnerUserId", "createdAt");
