# Editing Guide

## Slash Commands

- Slash command files live in `src/bot/commands/`.
- Shared command typing lives in `src/bot/commands/types.ts`.
- The slash command registry lives in `src/bot/commands/index.ts`.
- Slash command routing starts in `src/bot/events/interactionCreate.ts`.

## `~` Lion Text Commands

- Public lion text commands live in `src/bot/messages/lion-creatures.ts`.
- Message routing starts in `src/bot/events/messageCreate.ts`.
- Keep Discord `Message` handling in `src/bot/` and lion feature logic in `src/features/lions/`.

## Battle Logic

- Battle resolution, move selection, damage, and turn order live in `src/features/lions/lion-battle.service.ts`.
- Battle persistence, rewards, cooldowns, and challenge lifecycle live in `src/features/lions/lion-creature.service.ts`.
- Battle help and result formatting live in `src/features/lions/lion-formatting.ts`.

## Practice Logic

- Practice service logic lives in `src/features/practice/practice.service.ts`.
- Scheduled practice posting lives in `src/features/practice/practice-scheduler.ts`.
- Slash command and button adapters live in `src/bot/commands/practice.ts`.

## Economy and Red Envelopes

- Economy services live in `src/features/economy/`.
- Daily and coin slash commands live in `src/bot/commands/daily.ts` and `src/bot/commands/coins.ts`.
- Red envelope slash commands live in `src/bot/commands/redenvelope.ts`.
- Public `~grab` handling starts in `src/bot/events/messageCreate.ts`.

## Schedulers

- Scheduler startup is wired in `src/bot/events/ready.ts`.
- Scheduler implementations live in `src/features/practice/practice-scheduler.ts`, `src/features/economy/red-envelope-scheduler.ts`, and `src/features/lions/lion-spawn-scheduler.ts`.

## Prisma Models

- Current schema lives in `prisma/schema.prisma`.
- Migrations live in `prisma/migrations/`.
- Keep `docs/DATA_MODEL.md` aligned with the current schema.

## Tests

- Command tests live in `tests/*.command.test.ts`.
- Message-router coverage lives in `tests/lion-creatures.message.test.ts`.
- Service tests live in `tests/` under the matching domain name.
