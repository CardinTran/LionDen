# Data Model

## Overview

LionDen uses Prisma with SQLite. Most records are scoped by `guildId`, and many user-owned resources are additionally scoped by `userId`.

This document describes current Prisma models from `prisma/schema.prisma` only.

## Current Models

### User and Progression

- `UserProfile`
  - One profile per `guildId` + `userId`
  - Stores display name, XP, level, coins, and cooldown timestamps
  - Supports profile display, leaderboard, daily rewards, and message XP

### Economy

- `RedEnvelope`
  - Tracks a single red envelope drop and claim lifecycle
- `RedEnvelopeDropConfig`
  - Guild-level configuration for random red envelope drops
- `UserItemInventory`
  - Stores current item quantities per guild, user, and item key

### Bot Configuration

- `BotGuildConfig`
  - Guild-level maintenance mode and maintenance message

### Lion System

- `LionSpecies`
  - Master definition table for catchable lion species
- `UserLion`
  - A user's owned lion instance, including level, XP, nickname, cosmetic bond XP, cosmetic bond level, and care cooldown timestamps
  - `bondXp` starts at `0`; `bondLevel` starts at `1`
  - `lastFedAt` and `lastGroomedAt` enforce separate per-lion care cooldowns for `~feed` and `~groom`
  - `lastBondedAt` is reserved for future bond-action expansion; current `~bond` is display-only
  - Bond fields live on `UserLion`, so releasing a lion naturally removes its bond state
  - Bond and care fields do not affect combat, user XP, coins, House points, weekly challenge progress, badges, lion stats, or economy rewards
- `FavoriteLion`
  - One favorite owned lion per `guildId` + `userId`
  - Points to `UserLion` with cascade delete so releasing the lion clears the favorite record
  - Supports `/profile`, `~lions`, `~lion`, `~favorite`, and `~showcase` social display without changing lion power
- `UserLionTeamSlot`
  - Team composition slots that point to owned lions
- `ActiveLionSpawn`
  - Currently spawned wild lions in guild channels
- `LionShopItemDefinition`
  - Shop catalog for lion items and item effects
- `LionSpawnConfig`
  - Guild-level lion spawn scheduler configuration
- `LionChannelEffect`
  - Temporary channel-scoped lion item effects
- `LionBattleRecord`
  - Resolved battle history
- `LionBattleChallenge`
  - Pending or resolved battle invitations between users

### Practice

- `PracticeSession`
  - A manual or scheduled practice session with message references and lifecycle state
- `PracticeCheckIn`
  - RSVP and attendance state per user per session
- `PracticeSchedule`
  - Guild-level weekly practice posting configuration
- `PracticeRecapPost`
  - Records automatic practice recap posts created after `/practice end`
  - `guildId` + `practiceId` is unique, preventing duplicate automatic recap posts for the same practice session
  - Stores the channel, optional Discord message id, and post timestamp

Practice attendance history uses the existing practice tables. Completed-practice views include `PracticeSession` rows whose status is `ENDED` and whose `endedAt` timestamp is not in the future. A `PracticeCheckIn.attendanceStatus` of `HERE` counts as attended; `NOT_HERE` and missing check-ins are retained as neutral history states but do not count toward attendance totals, streaks, or leaderboards.

Practice recap auto-posting summarizes existing practice data only. It reads completed practice sessions, check-ins, XP reward fields, House point ledger rows, and streak history, then writes a `PracticeRecapPost` row only after the Discord recap message sends successfully. Manual `/practice recap` output is intentionally repeatable and does not require a `PracticeRecapPost` record.

### Weekly Challenges and Badges

- `WeeklyChallengeDefinition`
  - Seeded challenge definitions keyed by `challengeKey`
  - Stores title, description, activity type, target count, reward XP, reward coins, and enabled state
- `UserWeeklyChallengeProgress`
  - Per-guild, per-user weekly progress for one challenge definition and `weekKey`
  - Tracks progress count, completion time, and reward application time
- `BadgeDefinition`
  - Seeded badge definitions keyed by `badgeKey`
  - Stores generic LionDen badges, including weekly challenge badges and practice badge definitions
- `UserBadge`
  - Per-guild, per-user awarded badges
  - Practice badge idempotency uses the existing unique `guildId` + `userId` + `badgeKey` constraint
  - Practice badge definitions are global and can be disabled without deleting historical awards

### Team Houses / House Cup

- `House`
  - Guild-scoped Team House definition keyed by `guildId` + `houseKey`
  - Stores display name, optional description, optional emoji/color labels, active state, and timestamps
- `HouseMembership`
  - One current House membership per `guildId` + `userId`
  - Points to the assigned `House`
  - Leaving or removing a member deletes current membership but does not delete historical point ledger rows
- `HousePointLedger`
  - Append-only House point entries
  - Stores `guildId`, `houseId`, optional `userId`, `sourceType`, optional `sourceId`, signed point amount, reason, and timestamp
  - Negative entries are used for officer corrections; House totals are calculated by summing ledger rows
  - `guildId` + `sourceType` + `sourceId` is unique when a stable source ID is present, preventing duplicate hook awards for the same source
- `HousePointSourceType`
  - Enum for House point sources
  - Current implemented hook sources are `PRACTICE_ATTENDANCE`, `WEEKLY_CHALLENGE`, `RED_ENVELOPE_CLAIM`, `LION_CATCH`, `LION_TRAINING`, `TRAINING_BATTLE`, and `DUEL_COMPLETION`
  - `ADMIN_ADJUSTMENT` is used by `/houseadmin points add` and `/houseadmin points remove`
  - `MESSAGE_ACTIVITY` is reserved for later capped activity design
- `HouseRecapConfig`
  - One guild-scoped Weekly House Recap configuration per guild
  - Stores recap channel, enabled state, weekday, hour, minute, timezone, and timestamps
  - `weekday` uses `0` for Sunday through `6` for Saturday
- `HouseRecapPost`
  - Records Weekly House Recap posts by guild and week key
  - `guildId` + `weekKey` is unique, preventing normal duplicate weekly recap posts
  - Stores the channel, optional Discord message id, and post timestamp
- `HouseBadgeDefinition`
  - Seeded House achievement definitions keyed by `badgeKey`
  - Stores title, description, category, enabled state, and timestamps
  - Categories are social/cosmetic only and do not affect combat, XP, coins, economy, or House points
- `UserHouseBadge`
  - Per-guild, per-user awarded House badges
  - Stores the badge key, optional House context, optional weekly recap `weekKey`, awarded timestamp, and reason
  - `guildId` + `userId` + `badgeKey` + `weekKey` is unique for weekly badge awards
  - Lifetime badge idempotency is enforced in service logic because SQLite allows multiple `NULL` values inside composite unique indexes
- `HouseBadgeCategory`
  - Enum for House badge grouping: membership, weekly recap, practice, red envelope, lion activity, battle/duel, and contribution

## Planned Models

House title models are intentionally deferred until title selection and display rules are clearer.

## Relationship Summary

- `LionSpecies` has many `UserLion` and `ActiveLionSpawn`
- `UserLion` has many `UserLionTeamSlot`
- `PracticeSession` has many `PracticeCheckIn`
- `PracticeRecapPost` tracks automatic recap delivery for one completed practice session per guild
- `UserProfile` is the central per-user record for XP and coins
- Weekly challenge progress and badges are scoped by `guildId` + `userId`
- `House` has many `HouseMembership` and `HousePointLedger` records
- `HouseMembership` is unique per `guildId` + `userId`
- `House` can be associated with many `UserHouseBadge` awards as historical badge context

## Indexing Patterns

- Most active gameplay tables index by `guildId`
- User-owned records commonly index by `guildId` + `userId`
- Time-based flows index by status and timestamps for scheduler lookups

## Operational Notes

- Guild scoping is important across nearly every feature.
- Several flows use timestamps for cooldowns and schedulers:
  - message XP
  - daily rewards
  - red envelope drops
  - lion spawns
  - lion battle cooldowns
  - practice lifecycle posts
  - weekly challenge week keys
  - House point ledger entries

## Change Guidance

- When adding a new persisted feature:
  1. Update `prisma/schema.prisma`
  2. Add a Prisma migration
  3. Update or add tests
  4. Document the new entities here
