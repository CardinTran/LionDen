-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "rsvpStatus" TEXT,
    "attendanceStatus" TEXT,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeCheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PracticeCheckIn" ("checkedInAt", "displayName", "guildId", "id", "sessionId", "userId") SELECT "checkedInAt", "displayName", "guildId", "id", "sessionId", "userId" FROM "PracticeCheckIn";
DROP TABLE "PracticeCheckIn";
ALTER TABLE "new_PracticeCheckIn" RENAME TO "PracticeCheckIn";
CREATE INDEX "PracticeCheckIn_guildId_sessionId_idx" ON "PracticeCheckIn"("guildId", "sessionId");
CREATE UNIQUE INDEX "PracticeCheckIn_sessionId_userId_key" ON "PracticeCheckIn"("sessionId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
