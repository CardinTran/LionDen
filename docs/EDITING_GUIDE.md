# Editing Guide

## Common Edits

### Slash Commands

- Command files live in `src/bot/commands/`.
- Register commands in `src/bot/commands/index.ts`.
- Shared command typing lives in `src/bot/commands/types.ts`.
- Slash command dispatch happens in `src/bot/events/interactionCreate.ts`.

### Message Commands

- Lion `~` text commands live in `src/bot/messages/lion-creatures.ts`.
- Message routing starts in `src/bot/events/messageCreate.ts`.
- `~grab` is defined in `src/bot/commands/redenvelope.ts` and handled from the message-create event.

### Lion Features

- Main lion logic lives in `src/features/lions/`.
- Admin lion slash controls live in `src/bot/commands/lionadmin.ts`.
- Public lion text commands live in `src/bot/messages/lion-creatures.ts`.

### Practice Features

- Practice service logic lives in `src/features/practice/practice.service.ts`.
- Scheduled practice posting lives in `src/features/practice/practice-scheduler.ts`.
- Slash command and button adapters live in `src/bot/commands/practice.ts`.

### Economy Features

- Economy services live in `src/features/economy/`.
- Daily and coin slash commands live in `src/bot/commands/daily.ts` and `src/bot/commands/coins.ts`.
- Red envelope slash commands live in `src/bot/commands/redenvelope.ts`.
- Public envelope claims are routed from `src/bot/events/messageCreate.ts`.

### Prisma Models

- Current schema lives in `prisma/schema.prisma`.
- Migrations live in `prisma/migrations/`.
- Keep `docs/DATA_MODEL.md` aligned with the current schema only.

### Schedulers

- Scheduler startup is wired in `src/bot/events/ready.ts`.
- Scheduler implementations live in:
  - `src/features/practice/practice-scheduler.ts`
  - `src/features/economy/red-envelope-scheduler.ts`
  - `src/features/lions/lion-spawn-scheduler.ts`

### Tests

- Command tests live in `tests/*.command.test.ts`.
- Message-router coverage lives in `tests/lion-creatures.message.test.ts`.
- Service tests live beside their domain name in `tests/`.

## Safe Lion Router Decomposition Plan

Do not change runtime behavior during decomposition. Extract in small steps:

1. Move command-name constants and shared parsing helpers out of `src/bot/messages/lion-creatures.ts`.
2. Split handlers by concern while keeping one top-level router:
   - shop and inventory
   - capture and training
   - roster and team management
   - battles and challenges
   - read-only status and leaderboard commands
3. Keep Discord `Message` handling in the router layer and keep lion business logic in `src/features/lions/`.
4. Add routing tests around each extraction step before changing command flow.
