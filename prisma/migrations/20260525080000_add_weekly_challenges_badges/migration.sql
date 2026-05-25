-- CreateTable
CREATE TABLE "WeeklyChallengeDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserWeeklyChallengeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "progressCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "rewardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChallengeDefinition_challengeKey_key" ON "WeeklyChallengeDefinition"("challengeKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserWeeklyChallengeProgress_guildId_userId_challengeKey_weekKey_key" ON "UserWeeklyChallengeProgress"("guildId", "userId", "challengeKey", "weekKey");

-- CreateIndex
CREATE INDEX "UserWeeklyChallengeProgress_guildId_userId_weekKey_idx" ON "UserWeeklyChallengeProgress"("guildId", "userId", "weekKey");

-- CreateIndex
CREATE INDEX "UserWeeklyChallengeProgress_guildId_weekKey_idx" ON "UserWeeklyChallengeProgress"("guildId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeDefinition_badgeKey_key" ON "BadgeDefinition"("badgeKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_guildId_userId_badgeKey_key" ON "UserBadge"("guildId", "userId", "badgeKey");

-- CreateIndex
CREATE INDEX "UserBadge_guildId_userId_idx" ON "UserBadge"("guildId", "userId");
