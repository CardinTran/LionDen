# Editing Guide

## Common Edits

### Slash Commands

- Command files live in `src/bot/commands/`.
- Register commands in `src/bot/commands/index.ts`.
- Shared command typing lives in `src/bot/commands/types.ts`.
- Slash command dispatch happens in `src/bot/events/interactionCreate.ts`.
- Use [CONTRIBUTING_COMMANDS.md](CONTRIBUTING_COMMANDS.md) when adding or changing slash commands.

### Message Commands

- Lion `~` text commands are exported through `src/bot/messages/lion-creatures.ts`.
- The active lion text-command router lives in `src/bot/messages/lions/index.ts`.
- The lion text-command allow-list and parser live in `src/bot/messages/lions/parsing.ts`.
- Focused lion handlers live in `src/bot/messages/lions/*.handler.ts`.
- Message routing starts in `src/bot/events/messageCreate.ts`.
- `~grab` is defined in `src/bot/commands/redenvelope.ts` and handled from the message-create event.
- Public text commands are documented in [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md).

### Lion Features

- Main lion logic lives in `src/features/lions/`.
- Admin lion slash controls live in `src/bot/commands/lionadmin.ts`.
- Public lion text commands live under `src/bot/messages/lions/`.

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
- Scheduler timing and maintenance-mode expectations are documented in [OPERATIONS.md](OPERATIONS.md).

### Tests

- Command tests live in `tests/*.command.test.ts`.
- Message-router coverage lives in `tests/lion-creatures.message.test.ts`.
- Service tests live beside their domain name in `tests/`.

### Finishing a Task

- Mark completed work clearly in the final notes.
- Add follow-ups only after thinking through the best next move for the touched area.
- Prefer one focused follow-up over a long wishlist, especially when it protects a likely future refactor or fills a real validation gap.

## Contributor Guides

- Use [CONTRIBUTING_COMMANDS.md](CONTRIBUTING_COMMANDS.md) for adding slash commands, lion text commands, or schedulers.
- Use [OPERATIONS.md](OPERATIONS.md) for local/dev operations, scheduler timing, maintenance mode, admin workflows, migrations, and health checks.
