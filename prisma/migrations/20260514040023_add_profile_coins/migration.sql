-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lastMessageXpAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UserProfile" ("createdAt", "displayName", "guildId", "id", "lastMessageXpAt", "level", "updatedAt", "userId", "xp") SELECT "createdAt", "displayName", "guildId", "id", "lastMessageXpAt", "level", "updatedAt", "userId", "xp" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_guildId_userId_key" ON "UserProfile"("guildId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
