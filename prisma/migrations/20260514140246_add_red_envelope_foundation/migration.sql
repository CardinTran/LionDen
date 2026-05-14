-- CreateTable
CREATE TABLE "RedEnvelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdByDisplayName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "messageId" TEXT,
    "claimedByUserId" TEXT,
    "claimedByDisplayName" TEXT,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RedEnvelope_guildId_status_idx" ON "RedEnvelope"("guildId", "status");
