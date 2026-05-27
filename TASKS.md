# TASKS

## Current Completed Foundation

- [x] Add agent-oriented repository guidance in `AGENTS.md`
- [x] Add a high-level implementation plan in `PLAN.md`
- [x] Add a working task list in `TASKS.md`
- [x] Add architecture documentation in `docs/ARCHITECTURE.md`
- [x] Add data model documentation in `docs/DATA_MODEL.md`
- [x] Move the shared `SlashCommand` type into `src/bot/commands/types.ts`
- [x] Split Discord event handling into dedicated event files
- [x] Add tests around Discord event registration and routing seams
- [x] Add event-routing tests for `ready`, `interactionCreate`, and `messageCreate`
- [x] Decompose `src/bot/messages/lion-creatures.ts` into smaller routing modules without changing command behavior
- [x] Add focused tests for separated non-battle lion message handlers
- [x] Add focused tests for read-only lion message handlers
- [x] Add weekly challenges and badges foundation
- [x] Document the lion text-command surface separately from slash commands
- [x] Add a short contributor guide for introducing a new command or scheduler
- [x] Document operational conventions such as scheduler timing, maintenance-mode expectations, and admin-only workflows
- [x] Add deeper weekly challenge lifecycle tests after real server usage settles the first defaults
- [x] Prototype interactive 1v1 turn-based lion duels without changing existing automatic team battles

## New Product Direction

LionDen's next direction is to become a team-wide participation engine.

The next major focus is:

> Turn individual participation into team-wide momentum.

The roadmap for this next phase lives in:

- `docs/ROADMAP_NEXT.md`

---

# Stage 1: Team Houses / House Cup

## Sprint 1.1: Team Houses Foundation

- [x] Create `House` Prisma model
- [x] Create `HouseMembership` Prisma model
- [x] Create `HousePointLedger` Prisma model
- [x] Create `HousePointSourceType` enum
- [x] Add Prisma migration for House models
- [x] Add House service under `src/features/houses/`
- [x] Add `/house join`
- [x] Add `/house leave`
- [x] Add `/house profile`
- [x] Add `/house leaderboard`
- [x] Add `/house roster`
- [x] Add `/houseadmin create`
- [x] Add `/houseadmin assign`
- [x] Add `/houseadmin remove`
- [x] Add `/houseadmin rename`
- [x] Add `/houseadmin deactivate`
- [x] Add `/houseadmin points add`
- [x] Add `/houseadmin points remove`
- [x] Add House point hook for practice attendance
- [x] Add House point hook for weekly challenge completion
- [x] Add tests for House creation
- [x] Add tests for joining and leaving Houses
- [x] Add tests for officer assignment and removal
- [x] Add tests for one active House membership per user
- [x] Add tests for inactive House behavior
- [x] Add tests for point ledger entries
- [x] Add tests for leaderboard ordering
- [x] Add tests for practice attendance point hook
- [x] Add tests for weekly challenge completion point hook
- [x] Update `docs/COMMANDS.md`
- [x] Update `docs/DATA_MODEL.md`
- [x] Update `docs/OPERATIONS.md`
- [x] Update `docs/PRODUCT_SPEC.md`
- [x] Update `docs/ROADMAP_NEXT.md` if implementation details differ
- [x] Run validation commands

## Sprint 1.2: House Point Hooks Expansion

- [x] Add House point hook for red envelope claims
- [x] Add House point hook for wild lion catches
- [x] Add House point hook for lion training
- [x] Add House point hook for Training Hall battles
- [x] Add House point hook for interactive duel completions
- [ ] Consider capped House point hook for eligible message activity
- [x] Ensure all hooks are best-effort
- [x] Ensure hook failures log warnings without blocking original actions
- [x] Ensure members without Houses do not cause errors
- [x] Ensure duplicate sources do not double-award when source IDs are available
- [x] Add tests for each new House point hook
- [x] Add tests for hook failure behavior
- [x] Update `docs/OPERATIONS.md`
- [x] Update `docs/PRODUCT_SPEC.md`
- [x] Update `docs/ROADMAP_NEXT.md`

## Sprint 1.3: Weekly House Recap

- [x] Add weekly House recap aggregation service
- [x] Add top House standings for recap
- [x] Add top contributor standings for recap
- [x] Add category breakdown for recap
- [x] Add `/houseadmin recap configure`
- [x] Add `/houseadmin recap postnow`
- [x] Add `/houseadmin recap status`
- [x] Add scheduler if needed
- [x] Prevent duplicate recap posts
- [x] Log recap scheduler startup and failures
- [x] Add tests for recap aggregation
- [x] Add tests for top contributors
- [x] Add tests for category breakdown
- [x] Add tests for post-now command
- [x] Add tests for scheduler behavior if scheduler is added
- [x] Update `docs/COMMANDS.md`
- [x] Update `docs/OPERATIONS.md`
- [x] Update `docs/ROADMAP_NEXT.md`

## Sprint 1.4: House Badges and Titles

- [x] Add House badge definitions
- [ ] Add House title support if needed
- [x] Add House Founder badge
- [x] Add House Champion badge
- [x] Add Practice Powerhouse badge
- [x] Add Red Envelope Raider badge
- [x] Add Lion Handler badge
- [x] Add Duel Defender badge
- [x] Add Weekly Contributor badge
- [ ] Add title display to profile or House profile if appropriate
- [x] Ensure badge awards are idempotent
- [x] Add tests for House badge awarding
- [x] Add tests for duplicate badge prevention
- [ ] Add tests for title assignment
- [ ] Add tests for title display
- [x] Update `docs/COMMANDS.md`
- [x] Update `docs/DATA_MODEL.md`
- [x] Update `docs/OPERATIONS.md`
- [x] Update `docs/PRODUCT_SPEC.md`
- [x] Update `docs/ROADMAP_NEXT.md`

---

# Stage 2: Practice Streaks and Attendance Recaps

## Sprint 2.1: Practice Attendance History

- [ ] Add practice attendance aggregation service
- [ ] Add `/practice history [@user]`
- [ ] Add `/practice leaderboard`
- [ ] Add `/practice streaks`
- [ ] Add current streak calculation
- [ ] Add longest streak calculation
- [ ] Add monthly or season attendance count
- [ ] Add tests for attendance history
- [ ] Add tests for monthly attendance count
- [ ] Add tests for current streak
- [ ] Add tests for longest streak
- [ ] Add tests for missed practice handling
- [ ] Add tests for users with no attendance
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/PRODUCT_SPEC.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 2.2: Practice Recap

- [ ] Add practice recap generation service
- [ ] Add `/practice recap`
- [ ] Add attended count
- [ ] Add `Not Here` count
- [ ] Add no-response count
- [ ] Add XP awarded count
- [ ] Add House points awarded section if Houses exist
- [ ] Add top streaks section if streaks exist
- [ ] Consider auto-post after `/practice end`
- [ ] Add tests for recap generation
- [ ] Add tests for attendance categories
- [ ] Add tests for XP awarded count
- [ ] Add tests for House point summary if integrated
- [ ] Add tests for no active/closed session edge cases
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 2.3: Practice Badges

- [ ] Add First Practice badge
- [ ] Add Three Practice Streak badge
- [ ] Add Five Practice Streak badge
- [ ] Add Perfect Week badge
- [ ] Add Practice Regular badge
- [ ] Add Practice Veteran badge
- [ ] Ensure practice badges are idempotent
- [ ] Ensure no badge for `NOT_HERE`
- [ ] Ensure no badge for no response
- [ ] Add tests for each badge
- [ ] Add tests for duplicate prevention
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

---

# Stage 3: Seasonal Events

## Sprint 3.1: Seasonal Event Foundation

- [ ] Add `SeasonalEvent` Prisma model
- [ ] Add `SeasonalEventProgress` Prisma model
- [ ] Add Prisma migration for seasonal event models
- [ ] Add seasonal event service
- [ ] Add `/event status`
- [ ] Add `/event leaderboard`
- [ ] Add `/eventadmin create`
- [ ] Add `/eventadmin start`
- [ ] Add `/eventadmin end`
- [ ] Add `/eventadmin postnow`
- [ ] Add active event window logic
- [ ] Add event progress tracking
- [ ] Add event leaderboard sorting
- [ ] Add tests for active window behavior
- [ ] Add tests for inactive event behavior
- [ ] Add tests for progress tracking
- [ ] Add tests for leaderboard sorting
- [ ] Add tests for admin lifecycle
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 3.2: Lunar New Year Event

- [ ] Add Lunar New Year Red Envelope Rush event configuration
- [ ] Add boosted red envelope event behavior
- [ ] Add event points for red envelope claims
- [ ] Add event points for practice attendance
- [ ] Add Lunar Starter badge
- [ ] Add Red Envelope Hunter badge
- [ ] Add New Year Champion title or badge
- [ ] Ensure event rewards are modest
- [ ] Ensure event rewards are idempotent
- [ ] Ensure normal red envelope behavior resumes after event
- [ ] Add tests for event point recording
- [ ] Add tests for badge awarding
- [ ] Add tests for event end behavior
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 3.3: Performance Week Event

- [ ] Add Performance Week event configuration
- [ ] Add event points for practice attendance
- [ ] Add event points for RSVP response if available
- [ ] Add event points for event check-in if available
- [ ] Add performance week leaderboard
- [ ] Add performance week badges
- [ ] Add tests for performance event points
- [ ] Add tests for attendance event points
- [ ] Add tests for RSVP event points if implemented
- [ ] Add tests for leaderboard behavior
- [ ] Add tests for event ending
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

---

# Stage 4: Lion Bond / Care System

## Sprint 4.1: Lion Bond Foundation

- [ ] Add bond XP or bond level fields/models
- [ ] Add care cooldown tracking
- [ ] Add `~bond <lion>`
- [ ] Add `~feed <lion>`
- [ ] Add `~groom <lion>`
- [ ] Add bond gain logic
- [ ] Add bond level calculation
- [ ] Add mostly cosmetic bond rewards
- [ ] Ensure cooldowns prevent spam
- [ ] Ensure bond does not create major combat advantage
- [ ] Add tests for cooldowns
- [ ] Add tests for bond gain
- [ ] Add tests for bond level calculation
- [ ] Add tests for invalid lion query
- [ ] Add tests for no owned lion edge cases
- [ ] Update `docs/LION_TEXT_COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 4.2: Lion Showcase

- [ ] Add favorite lion support
- [ ] Add `~favorite <lion>`
- [ ] Add `~showcase <lion>`
- [ ] Add favorite lion display to profile or roster if appropriate
- [ ] Add public lion showcase formatting
- [ ] Add tests for setting favorite lion
- [ ] Add tests for changing favorite lion
- [ ] Add tests for showcasing owned lion
- [ ] Add tests for invalid lion query
- [ ] Update `docs/LION_TEXT_COMMANDS.md`
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

---

# Stage 5: Performance and Member Onboarding Tools

## Sprint 5.1: New Member Welcome Quests

- [ ] Add welcome quest service
- [ ] Add welcome quest progress model if needed
- [ ] Add `/welcomequest`
- [ ] Add `/welcomequest status`
- [ ] Add quest step for introduction if feasible
- [ ] Add quest step for first practice attendance
- [ ] Add quest step for first red envelope claim
- [ ] Add quest step for first lion catch
- [ ] Add quest step for first weekly challenge completion
- [ ] Add New Cub badge
- [ ] Add starter coin reward
- [ ] Add starter basic ball bundle reward
- [ ] Ensure rewards are idempotent
- [ ] Add tests for quest progress
- [ ] Add tests for first-time triggers
- [ ] Add tests for duplicate reward prevention
- [ ] Add tests for badge awarding
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

## Sprint 5.2: Performance Event Planning

- [ ] Add performance event model
- [ ] Add performance RSVP model if needed
- [ ] Add performance role assignment model if needed
- [ ] Add `/performance create`
- [ ] Add `/performance rsvp`
- [ ] Add `/performance roster`
- [ ] Add `/performance roles`
- [ ] Add `/performance checkin`
- [ ] Add role support for lion head
- [ ] Add role support for lion tail
- [ ] Add role support for drummer
- [ ] Add role support for cymbals
- [ ] Add role support for gong
- [ ] Add role support for Buddha
- [ ] Add role support for driver
- [ ] Add role support for equipment
- [ ] Add tests for performance creation
- [ ] Add tests for RSVP
- [ ] Add tests for role assignment
- [ ] Add tests for roster output
- [ ] Add tests for check-in
- [ ] Add tests for permission controls
- [ ] Update `docs/COMMANDS.md`
- [ ] Update `docs/DATA_MODEL.md`
- [ ] Update `docs/OPERATIONS.md`
- [ ] Update `docs/ROADMAP_NEXT.md`

---

# Recurring Maintenance Tasks

- [ ] Keep docs updated as new bot domains are added
- [ ] Keep `docs/COMMANDS.md` aligned with public and admin command behavior
- [ ] Keep `docs/LION_TEXT_COMMANDS.md` aligned with `~` command behavior
- [ ] Keep `docs/DATA_MODEL.md` aligned with Prisma schema changes
- [ ] Keep `docs/OPERATIONS.md` aligned with scheduler and admin workflow changes
- [ ] Keep `AGENTS.md` aligned with repo workflow expectations
- [ ] Run validation before merging feature PRs
- [ ] Avoid spam-based reward loops
- [ ] Prefer meaningful participation over passive grinding
