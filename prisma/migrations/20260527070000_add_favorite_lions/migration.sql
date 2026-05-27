-- CreateTable
CREATE TABLE "FavoriteLion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FavoriteLion_lionId_fkey" FOREIGN KEY ("lionId") REFERENCES "UserLion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteLion_guildId_userId_key" ON "FavoriteLion"("guildId", "userId");

-- CreateIndex
CREATE INDEX "FavoriteLion_guildId_lionId_idx" ON "FavoriteLion"("guildId", "lionId");
