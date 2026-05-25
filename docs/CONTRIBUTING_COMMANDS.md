# Contributing Commands and Schedulers

## Purpose

Use this guide when adding or changing slash commands, lion `~` text commands, or runtime schedulers. Keep Discord adapter code in `src/bot/`, business logic in `src/features/`, and persistence changes in `prisma/schema.prisma`.

Do not use this guide as permission to add behavior outside the task scope. For docs-only work, inspect these files but do not change runtime code.

## Before You Start

1. Start from `develop` and create a short task branch.
2. Read the current command, event, service, and test files for the feature area.
3. Decide whether the change is a public member command, an admin workflow, a background scheduler, or a service-only change.
4. Check whether the feature needs data model changes. If it does, update `prisma/schema.prisma`, add a migration, and update [DATA_MODEL.md](DATA_MODEL.md).

## Adding a Slash Command

Slash command adapters live in `src/bot/commands/`. Shared typing lives in `src/bot/commands/types.ts`, and dispatch goes through `src/bot/events/interactionCreate.ts`.

Checklist:

1. Add or update a command adapter in `src/bot/commands/`.
2. Export a `SlashCommand` with `data` and `execute`.
3. Keep Discord validation and reply formatting in the adapter; put reusable behavior and Prisma access in `src/features/`.
4. Add the command to `commands` in `src/bot/commands/index.ts`.
5. Use `setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)` and an explicit runtime permission check for officer/admin workflows.
6. If the command has buttons or other interactions, route them from `src/bot/events/interactionCreate.ts` using stable custom IDs.
7. Update [COMMANDS.md](COMMANDS.md) for command names, permissions, behavior, or output changes.
8. Add or update focused command and event tests in `tests/`.
9. Re-register slash commands in the test guild with `npm run discord:register`.

Keep command replies ephemeral for admin-only status, setup, and recovery actions unless the command intentionally posts public gameplay content.

## Adding a Lion `~` Text Command

Lion text commands are documented in [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md).

Current routing:

- `src/bot/events/messageCreate.ts`: maintenance checks, `~grab`, lion command router, activity, and message XP
- `src/bot/messages/lion-creatures.ts`: compatibility export
- `src/bot/messages/lions/parsing.ts`: allow-list and parser
- `src/bot/messages/lions/index.ts`: active router and handler order
- `src/bot/messages/lions/*.handler.ts`: focused command handlers

Checklist:

1. Add the command name to `LION_MESSAGE_COMMANDS` in `src/bot/messages/lions/parsing.ts`.
2. Add a focused handler under `src/bot/messages/lions/`, or extend the nearest existing handler when that keeps the concern together.
3. Register the handler in `lionMessageHandlers` in `src/bot/messages/lions/index.ts`.
4. Keep message parsing and Discord replies in the handler; keep lion state and Prisma work in `src/features/lions/`.
5. Reuse `getDisplayName`, `ensureLionData`, service helpers, and formatter helpers before adding new plumbing.
6. If the command is public, update `formatLionHelpMessage` in `src/features/lions/lion-formatting.ts`.
7. Update [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md). Update [COMMANDS.md](COMMANDS.md) only if its high-level pointer needs to change.
8. Add parser, router, and focused handler tests. Existing examples include `tests/lion-message-parsing.test.ts`, `tests/lion-creatures.message.test.ts`, `tests/lion-non-battle-handlers.test.ts`, and `tests/lion-readonly-handlers.test.ts`.

`~grab` is the exception: it is a red envelope text command handled directly in `src/bot/events/messageCreate.ts` with formatting helpers from `src/bot/commands/redenvelope.ts`.

## Adding a Scheduler

Scheduler startup is wired from `src/bot/events/ready.ts`. Current scheduler implementations live in:

- `src/features/practice/practice-scheduler.ts`
- `src/features/economy/red-envelope-scheduler.ts`
- `src/features/lions/lion-spawn-scheduler.ts`

Checklist:

1. Put scheduler logic in the owning feature area under `src/features/`.
2. Export a `start...Scheduler(client)` function for runtime startup and a `run...SchedulerTick(...)` function for focused tests when practical.
3. Make startup idempotent with a module-level timer guard.
4. Run one initial tick, then schedule repeated ticks. Current schedulers tick every 60 seconds.
5. Check maintenance mode before posting public scheduled content.
6. Log scheduler startup or tick failures without leaking secrets or environment values.
7. Keep Discord channel fetching and posting narrow; put state transitions in service functions.
8. Wire startup in `src/bot/events/ready.ts`.
9. Add tests for timing decisions, channel resolution, skipped states, or service transitions.
10. Update [OPERATIONS.md](OPERATIONS.md), [DEV_CHECKLIST.md](DEV_CHECKLIST.md), or [DEPLOYMENT.md](DEPLOYMENT.md) if the local runbook changes.

If the scheduler introduces or changes persisted state, update Prisma, migrations, and [DATA_MODEL.md](DATA_MODEL.md).

## Validation

For behavior changes, run the relevant subset first, then the full PR checks when practical:

```sh
npm run typecheck
npm run test
npm run lint
npm run build
npx prisma validate
```

For docs-only changes, at least review links and command names against the current source files.
