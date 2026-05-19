ALTER TABLE "LionBattleChallenge" ADD COLUMN "acceptedAt" DATETIME;

ALTER TABLE "LionBattleChallenge" ADD COLUMN "declinedAt" DATETIME;

ALTER TABLE "LionBattleChallenge" ADD COLUMN "resolvedBattleRecordId" TEXT;

UPDATE "LionBattleChallenge"
SET "acceptedAt" = "respondedAt"
WHERE "status" = 'ACCEPTED'
  AND "respondedAt" IS NOT NULL
  AND "acceptedAt" IS NULL;

UPDATE "LionBattleChallenge"
SET "declinedAt" = "respondedAt"
WHERE "status" = 'DECLINED'
  AND "respondedAt" IS NOT NULL
  AND "declinedAt" IS NULL;

UPDATE "LionBattleChallenge"
SET "resolvedBattleRecordId" = "battleRecordId"
WHERE "battleRecordId" IS NOT NULL
  AND "resolvedBattleRecordId" IS NULL;
