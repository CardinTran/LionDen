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
  - A user's owned lion instance, including level, XP, and nickname
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

### Weekly Challenges and Badges

- `WeeklyChallengeDefinition`
  - Seeded challenge definitions keyed by `challengeKey`
  - Stores title, description, activity type, target count, reward XP, reward coins, and enabled state
- `UserWeeklyChallengeProgress`
  - Per-guild, per-user weekly progress for one challenge definition and `weekKey`
  - Tracks progress count, completion time, and reward application time
- `BadgeDefinition`
  - Seeded badge definitions keyed by `badgeKey`
- `UserBadge`
  - Per-guild, per-user awarded badges

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
  - Current implemented hook sources are `PRACTICE_ATTENDANCE` and `WEEKLY_CHALLENGE`
  - `ADMIN_ADJUSTMENT` is used by `/houseadmin points add` and `/houseadmin points remove`
  - Other enum values are reserved for later hook expansion

## Planned Models

No planned or future-only Prisma models are documented here today.

## Relationship Summary

- `LionSpecies` has many `UserLion` and `ActiveLionSpawn`
- `UserLion` has many `UserLionTeamSlot`
- `PracticeSession` has many `PracticeCheckIn`
- `UserProfile` is the central per-user record for XP and coins
- Weekly challenge progress and badges are scoped by `guildId` + `userId`
- `House` has many `HouseMembership` and `HousePointLedger` records
- `HouseMembership` is unique per `guildId` + `userId`

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
