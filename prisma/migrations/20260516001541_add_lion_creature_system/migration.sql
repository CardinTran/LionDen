-- CreateTable
CREATE TABLE "LionSpecies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "baseCatchRate" INTEGER NOT NULL DEFAULT 60,
    "baseValue" INTEGER NOT NULL DEFAULT 1,
    "spawnWeight" INTEGER NOT NULL DEFAULT 100,
    "primaryType" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "secondaryType" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserLion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lionSpeciesId" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLion_lionSpeciesId_fkey" FOREIGN KEY ("lionSpeciesId") REFERENCES "LionSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActiveLionSpawn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lionSpeciesId" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "spawnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "caughtByUserId" TEXT,
    "caughtByDisplayName" TEXT,
    "caughtAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActiveLionSpawn_lionSpeciesId_fkey" FOREIGN KEY ("lionSpeciesId") REFERENCES "LionSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LionShopItemDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "effectType" TEXT NOT NULL,
    "effectValue" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserItemInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LionSpawnConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minIntervalMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxIntervalMinutes" INTEGER NOT NULL DEFAULT 240,
    "nextSpawnAt" DATETIME,
    "lastSpawnedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LionSpecies_slug_key" ON "LionSpecies"("slug");

-- CreateIndex
CREATE INDEX "LionSpecies_rarity_isEnabled_idx" ON "LionSpecies"("rarity", "isEnabled");

-- CreateIndex
CREATE INDEX "UserLion_guildId_userId_idx" ON "UserLion"("guildId", "userId");

-- CreateIndex
CREATE INDEX "UserLion_lionSpeciesId_idx" ON "UserLion"("lionSpeciesId");

-- CreateIndex
CREATE INDEX "ActiveLionSpawn_guildId_status_idx" ON "ActiveLionSpawn"("guildId", "status");

-- CreateIndex
CREATE INDEX "ActiveLionSpawn_guildId_channelId_status_idx" ON "ActiveLionSpawn"("guildId", "channelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LionShopItemDefinition_itemKey_key" ON "LionShopItemDefinition"("itemKey");

-- CreateIndex
CREATE INDEX "UserItemInventory_guildId_userId_idx" ON "UserItemInventory"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemInventory_guildId_userId_itemKey_key" ON "UserItemInventory"("guildId", "userId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "LionSpawnConfig_guildId_key" ON "LionSpawnConfig"("guildId");
