-- CreateTable
CREATE TABLE "RedEnvelopeDropConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minAmount" INTEGER NOT NULL DEFAULT 10,
    "maxAmount" INTEGER NOT NULL DEFAULT 50,
    "minIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxIntervalMinutes" INTEGER NOT NULL DEFAULT 180,
    "nextDropAt" DATETIME,
    "lastDroppedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RedEnvelopeDropConfig_guildId_key" ON "RedEnvelopeDropConfig"("guildId");
