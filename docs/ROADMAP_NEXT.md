# LionDen Next Roadmap

## Purpose of This Roadmap

This roadmap defines LionDen’s next product direction after the original foundation work was completed.

LionDen is no longer just a basic Discord bot. It now has:

- profiles, XP, levels, and coins
- `/daily`
- red envelopes and `~grab`
- scheduled practice attendance
- weekly challenges and badges
- wild lion spawns
- lion catching, training, nicknames, teams, inventory, shop, and release
- automatic team battles
- Training Hall battles
- battle history, battle stats, and battle leaderboards
- interactive `~duel @user` prototype
- admin controls
- `/botadmin health`
- structured logs
- contributor docs
- operations docs
- strong test coverage around routing, handlers, weekly challenges, and services

The next direction is to make LionDen feel less like a collection of individual mini-games and more like a **team activity engine** for the lion dance team.

The new direction is:

> Turn individual participation into team-wide momentum.

The most important next system is **Team Houses / House Cup**.

---

# Product Goal

LionDen should increase meaningful team activity without encouraging spam.

The bot should reward:

- practice attendance
- recurring participation
- helpful community behavior
- team identity
- event participation
- friendly competition
- new member onboarding
- culturally themed engagement

The bot should avoid:

- spam-based grinding
- bloated economy mechanics
- features that only reward solo play
- overly complex systems before the team has validated interest
- breaking existing battle, practice, weekly challenge, or lion systems

---

# Guiding Principles

## 1. Reward Real Team Participation First

Practice attendance, event participation, and useful team engagement should matter more than passive grinding.

Practice should remain one of the highest-value activities in the bot.

## 2. Make Activity Social

The best next features should make members talk, react, compete, and encourage each other.

Individual progression already exists. The next stage should make individual progress benefit a larger group.

## 3. Avoid Spam Loops

Any message-based reward must include cooldowns, caps, or limits.

Do not create systems where members can farm points by sending low-effort messages.

## 4. Keep Officers in Control

Admin/officer tools should support:

- manual assignment
- correction
- state recovery
- manual point adjustments
- configuration
- status checks

## 5. Build in Small Reviewable PRs

Each sprint should be one focused branch.

Avoid combining unrelated systems in the same PR.

## 6. Preserve Existing Behavior

Do not replace existing automatic battles, weekly challenges, practice, red envelopes, or lion systems unless a sprint explicitly requires a small integration.

New systems should build on existing systems.

## 7. Add Tests With Every Feature

Each sprint should add focused tests for:

- service logic
- command behavior
- formatting
- hooks
- edge cases
- idempotency when relevant

## 8. Keep Docs Updated

When adding public commands, update:

- `docs/COMMANDS.md`
- `docs/LION_TEXT_COMMANDS.md` if it is a `~` command
- `docs/DATA_MODEL.md` for schema changes
- `docs/OPERATIONS.md` for admin/scheduler behavior
- `TASKS.md` when completing a sprint

---

# Current Completed Foundation

This section describes what already exists and should generally be preserved.

## Core Progression

- user profiles
- XP
- levels
- coins
- `/profile`
- `/leaderboard`
- `/daily`
- admin XP controls
- admin coin controls

## Practice System

- manual practice sessions
- scheduled RSVP posts
- scheduled attendance posts
- attendance check-in buttons
- practice XP rewards
- practice configuration
- attendance status tracking

## Red Envelope System

- manual red envelopes
- automated random red envelope drops
- activity-based channel targeting
- `~grab`
- officer configuration
- pause/resume behavior
- forced drops
- clear stale drops
- status checks
- automatic expiration

## Lion Creature System

- seeded lion species catalog
- lion shop
- item inventory
- wild lion spawns
- catching
- training
- nicknames
- release-for-coins
- owned lion roster
- top lions
- rare catches
- channel effects

## Battle Systems

- saved battle teams
- automatic team battles
- Training Hall battles
- battle challenges
- battle accept/decline/cancel
- battle history
- battle stats
- battle leaderboard
- interactive `~duel @user` prototype

## Weekly Challenges and Badges

- `/weekly challenges`
- `/weekly badges`
- default weekly challenge definitions
- badge definitions
- weekly progress tracking
- reward application
- best-effort progress hooks
- lifecycle tests

## Development Hardening

- `/botadmin health`
- structured logging
- event routing tests
- decomposed lion message router
- non-battle handler tests
- read-only handler tests
- weekly lifecycle tests
- contributor docs
- operations docs
- lion text-command docs

---

# New Roadmap Overview

The next roadmap has five major stages:

1. **Team Houses / House Cup**
2. **Practice Streaks and Attendance Recaps**
3. **Seasonal Events**
4. **Lion Bond / Care System**
5. **Performance and Member Onboarding Tools**

The priority order is intentional.

Team Houses should come first because it connects every existing system into a social team-wide competition.

---

# Stage 1: Team Houses / House Cup

## Product Goal

Create a team-based competition layer where members belong to Houses or Crews.

Houses earn points from meaningful activities like:

- practice attendance
- weekly challenge completion
- red envelope claims
- wild lion catches
- lion training
- Training Hall battles
- interactive duel completion
- capped message activity
- officer manual awards

This system should make the Discord server feel more alive because members are no longer only progressing individually. Their activity helps their House.

## Why This Matters

LionDen currently has many strong individual systems. Team Houses connect those systems into a social structure.

This creates:

- friendly competition
- team identity
- peer encouragement
- recurring discussion
- reasons to check standings
- officer-friendly engagement tracking
- better alignment with real lion dance team culture

## Recommended Naming

Use **House** as the product term.

Examples:

- Red House
- Gold House
- Black House
- Dragon House
- Drumline House
- Lion Crew
- Buddha Crew

The command surface should use:

- `/house`
- `/houseadmin`

## Core Concepts

### House

A persistent group inside the Discord server.

### House Membership

A user can belong to one House in a guild.

### House Points

A point ledger records why points were earned or removed.

### House Cup

A recurring leaderboard showing House standings.

---

## Sprint 1.1: Team Houses Foundation

Status: implemented.

Implemented behavior:

- `House`, `HouseMembership`, `HousePointLedger`, and `HousePointSourceType` are persisted through Prisma.
- Public `/house` commands support joining, leaving, profile viewing, leaderboard viewing, and roster viewing.
- Officer `/houseadmin` commands support House creation, assignment, removal, renaming, deactivation, and manual point adjustments.
- Practice attendance records 10 House points after attendance XP is applied.
- Weekly challenge completion records 5 House points when a challenge is newly completed.
- House point hooks are best-effort and skip members without Houses.
- House Cup standings are calculated from the point ledger.

## Sprint 1.2: House Point Hooks Expansion

Status: implemented.

Implemented behavior:

- Red envelope claims record 1 House point after successful `~grab` claims.
- Wild lion catches record 1 House point after successful `~catch` actions.
- Lion training records 1 House point after successful `~train` actions.
- Training Hall battles record 2 House points after completed `~battle training` battles.
- Interactive duel completions record 2 House points for each participant after completed `~duel` sessions.
- Hook failures are logged and do not block the original action.
- Members without Houses are skipped by point hooks.
- Stable source IDs prevent duplicate hook awards when the same completed action is retried.

Message activity House points remain a future consideration. They should wait for a capped anti-spam design instead of rewarding raw message volume.

## Sprint 1.3: Weekly House Recap

Next focus:

- Aggregate weekly House standings from the point ledger.
- Show top Houses, top contributors, and source breakdowns.
- Add officer controls for configuring, previewing, and posting recaps.
- Prevent duplicate recap posts for the same guild and week.
