-- CreateTable
CREATE TABLE "UserLionTeamSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "userLionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLionTeamSlot_userLionId_fkey" FOREIGN KEY ("userLionId") REFERENCES "UserLion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserLionTeamSlot_guildId_userId_idx" ON "UserLionTeamSlot"("guildId", "userId");

-- CreateIndex
CREATE INDEX "UserLionTeamSlot_userLionId_idx" ON "UserLionTeamSlot"("userLionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLionTeamSlot_guildId_userId_slot_key" ON "UserLionTeamSlot"("guildId", "userId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "UserLionTeamSlot_guildId_userId_userLionId_key" ON "UserLionTeamSlot"("guildId", "userId", "userLionId");
