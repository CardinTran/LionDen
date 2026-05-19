PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_LionBattleChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "challengerDisplayName" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "opponentDisplayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "declinedAt" DATETIME,
    "resolvedBattleRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_LionBattleChallenge" (
    "id",
    "guildId",
    "channelId",
    "challengerUserId",
    "challengerDisplayName",
    "opponentUserId",
    "opponentDisplayName",
    "status",
    "expiresAt",
    "acceptedAt",
    "declinedAt",
    "resolvedBattleRecordId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "guildId",
    "channelId",
    "challengerUserId",
    "challengerDisplayName",
    "opponentUserId",
    "opponentDisplayName",
    "status",
    "expiresAt",
    "acceptedAt",
    "declinedAt",
    "resolvedBattleRecordId",
    "createdAt",
    "updatedAt"
FROM "LionBattleChallenge";

DROP TABLE "LionBattleChallenge";

ALTER TABLE "new_LionBattleChallenge" RENAME TO "LionBattleChallenge";

CREATE INDEX "LionBattleChallenge_guildId_channelId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "channelId", "status", "expiresAt");

CREATE INDEX "LionBattleChallenge_guildId_challengerUserId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "challengerUserId", "status", "expiresAt");

CREATE INDEX "LionBattleChallenge_guildId_opponentUserId_status_expiresAt_idx" ON "LionBattleChallenge"("guildId", "opponentUserId", "status", "expiresAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
