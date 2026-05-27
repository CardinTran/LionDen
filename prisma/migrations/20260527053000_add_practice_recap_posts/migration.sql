-- CreateTable
CREATE TABLE "PracticeRecapPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeRecapPost_guildId_practiceId_key" ON "PracticeRecapPost"("guildId", "practiceId");

-- CreateIndex
CREATE INDEX "PracticeRecapPost_guildId_postedAt_idx" ON "PracticeRecapPost"("guildId", "postedAt");
