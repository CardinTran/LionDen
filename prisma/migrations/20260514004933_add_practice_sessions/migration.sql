-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "startedByUserId" TEXT NOT NULL,
    "startedByDisplayName" TEXT NOT NULL,
    "announcementChannelId" TEXT NOT NULL,
    "announcementMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "endedByUserId" TEXT
);

-- CreateTable
CREATE TABLE "PracticeCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeCheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PracticeSession_guildId_status_idx" ON "PracticeSession"("guildId", "status");

-- CreateIndex
CREATE INDEX "PracticeCheckIn_guildId_sessionId_idx" ON "PracticeCheckIn"("guildId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCheckIn_sessionId_userId_key" ON "PracticeCheckIn"("sessionId", "userId");
