-- CreateTable
CREATE TABLE "PracticeSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "startedByUserId" TEXT NOT NULL,
    "startedByDisplayName" TEXT NOT NULL,
    "announcementChannelId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "scheduledDateKey" TEXT,
    "scheduledStartAt" DATETIME,
    "scheduledEndAt" DATETIME,
    "announcementMessageId" TEXT,
    "rsvpMessageId" TEXT,
    "rsvpPostedAt" DATETIME,
    "attendanceMessageId" TEXT,
    "attendancePostedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "endedByUserId" TEXT
);
INSERT INTO "new_PracticeSession" ("announcementChannelId", "announcementMessageId", "endedAt", "endedByUserId", "guildId", "id", "startedAt", "startedByDisplayName", "startedByUserId", "status") SELECT "announcementChannelId", "announcementMessageId", "endedAt", "endedByUserId", "guildId", "id", "startedAt", "startedByDisplayName", "startedByUserId", "status" FROM "PracticeSession";
DROP TABLE "PracticeSession";
ALTER TABLE "new_PracticeSession" RENAME TO "PracticeSession";
CREATE INDEX "PracticeSession_guildId_status_idx" ON "PracticeSession"("guildId", "status");
CREATE UNIQUE INDEX "PracticeSession_guildId_source_scheduledDateKey_key" ON "PracticeSession"("guildId", "source", "scheduledDateKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSchedule_guildId_key" ON "PracticeSchedule"("guildId");
