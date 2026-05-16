-- CreateTable
CREATE TABLE "LionChannelEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "effectValue" INTEGER NOT NULL,
    "activatedByUserId" TEXT NOT NULL,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LionChannelEffect_guildId_channelId_idx" ON "LionChannelEffect"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "LionChannelEffect_guildId_expiresAt_idx" ON "LionChannelEffect"("guildId", "expiresAt");
