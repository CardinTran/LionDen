-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LionSpecies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "baseCatchRate" INTEGER NOT NULL DEFAULT 60,
    "baseValue" INTEGER NOT NULL DEFAULT 1,
    "spawnWeight" INTEGER NOT NULL DEFAULT 100,
    "primaryType" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "secondaryType" TEXT,
    "baseHp" INTEGER NOT NULL DEFAULT 50,
    "baseAttack" INTEGER NOT NULL DEFAULT 10,
    "baseDefense" INTEGER NOT NULL DEFAULT 10,
    "baseSpeed" INTEGER NOT NULL DEFAULT 10,
    "abilityKey" TEXT NOT NULL DEFAULT 'steady-heart',
    "abilityName" TEXT NOT NULL DEFAULT 'Steady Heart',
    "abilityDescription" TEXT NOT NULL DEFAULT 'No special battle effect yet.',
    "description" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LionSpecies" (
    "abilityDescription",
    "abilityKey",
    "abilityName",
    "baseAttack",
    "baseCatchRate",
    "baseDefense",
    "baseHp",
    "baseSpeed",
    "baseValue",
    "createdAt",
    "description",
    "id",
    "imagePath",
    "isEnabled",
    "name",
    "primaryType",
    "publicId",
    "rarity",
    "secondaryType",
    "slug",
    "spawnWeight",
    "updatedAt"
)
SELECT
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 'A legendary passive trait reserved for future battle effects.'
        WHEN 'EPIC' THEN 'A pressure-based passive trait reserved for future battle effects.'
        WHEN 'RARE' THEN 'A defensive passive trait reserved for future battle effects.'
        WHEN 'UNCOMMON' THEN 'A speed-oriented passive trait reserved for future battle effects.'
        ELSE 'A dependable passive trait reserved for future battle effects.'
    END,
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 'lionheart'
        WHEN 'EPIC' THEN 'royal-roar'
        WHEN 'RARE' THEN 'pride-guard'
        WHEN 'UNCOMMON' THEN 'quick-pounce'
        ELSE 'steady-heart'
    END,
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 'Lionheart'
        WHEN 'EPIC' THEN 'Royal Roar'
        WHEN 'RARE' THEN 'Pride Guard'
        WHEN 'UNCOMMON' THEN 'Quick Pounce'
        ELSE 'Steady Heart'
    END,
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 22
        WHEN 'EPIC' THEN 18
        WHEN 'RARE' THEN 15
        WHEN 'UNCOMMON' THEN 12
        ELSE 10
    END,
    "baseCatchRate",
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 19
        WHEN 'EPIC' THEN 16
        WHEN 'RARE' THEN 13
        WHEN 'UNCOMMON' THEN 11
        ELSE 9
    END,
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 90
        WHEN 'EPIC' THEN 76
        WHEN 'RARE' THEN 64
        WHEN 'UNCOMMON' THEN 55
        ELSE 48
    END,
    CASE "rarity"
        WHEN 'LEGENDARY' THEN 18
        WHEN 'EPIC' THEN 15
        WHEN 'RARE' THEN 13
        WHEN 'UNCOMMON' THEN 11
        ELSE 10
    END,
    "baseValue",
    "createdAt",
    "description",
    "id",
    "imagePath",
    "isEnabled",
    "name",
    "primaryType",
    CASE
        WHEN "slug" GLOB 'rdl-lion-[0-9][0-9][0-9]' THEN 'L' || substr("slug", -3)
        ELSE 'LION-' || substr("id", 1, 8)
    END,
    "rarity",
    "secondaryType",
    "slug",
    "spawnWeight",
    "updatedAt"
FROM "LionSpecies";
DROP TABLE "LionSpecies";
ALTER TABLE "new_LionSpecies" RENAME TO "LionSpecies";
CREATE UNIQUE INDEX "LionSpecies_publicId_key" ON "LionSpecies"("publicId");
CREATE UNIQUE INDEX "LionSpecies_slug_key" ON "LionSpecies"("slug");
CREATE INDEX "LionSpecies_publicId_idx" ON "LionSpecies"("publicId");
CREATE INDEX "LionSpecies_rarity_isEnabled_idx" ON "LionSpecies"("rarity", "isEnabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
