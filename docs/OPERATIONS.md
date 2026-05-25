# Operations Guide

## Purpose

These notes cover local and development operations for LionDen: scheduler timing, maintenance mode, admin-only workflows, migrations, and health checks. This is not a production hosting runbook.

For first-time setup, use [DEV_CHECKLIST.md](DEV_CHECKLIST.md). For command names, use [COMMANDS.md](COMMANDS.md) and [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md).

## Local Development

Typical local flow:

```sh
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run discord:register
npm run dev
```

After pulling changes, apply committed migrations and regenerate the Prisma client before starting the bot:

```sh
npm run prisma:migrate:deploy
npm run prisma:generate
```

Slash command changes require `npm run discord:register` before Discord will show the updated guild commands.

## Scheduler Startup

Schedulers start from `src/bot/events/ready.ts` after the Discord client is ready, guild bot config exists, and presence has been applied.

Current schedulers:

- Practice: `src/features/practice/practice-scheduler.ts`
- Red envelopes: `src/features/economy/red-envelope-scheduler.ts`
- Wild lions: `src/features/lions/lion-spawn-scheduler.ts`

Each current scheduler uses a module-level timer guard, runs one initial tick, and then ticks every 60 seconds.

## Scheduler Timing

Practice scheduler:

- Uses `America/Chicago`.
- Posts RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time.
- Posts attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time.
- Skips posting when maintenance mode is enabled for the guild.
- Skips posting if the configured schedule has no channel, the channel cannot be fetched as a text channel, or a practice session is already active.

Red envelope scheduler:

- Uses each guild's configured amount and interval ranges from `/redenvelope configure`.
- Skips posting when maintenance mode is enabled for the guild.
- Skips posting when another open red envelope already exists in the guild.
- Targets the most active eligible recent channel when possible, falling back to the configured channel.
- Activity targeting uses recent human message activity; the current default window is 60 minutes with at least 5 messages.
- Open red envelopes expire after 15 minutes.

Wild lion spawn scheduler:

- Uses each guild's lion spawn configuration from `/lionadmin configure`.
- Defaults to a 120-240 minute interval when the spawn config is created by current service defaults.
- Skips posting when maintenance mode is enabled for the guild.
- Expires active wild spawns before checking whether a new spawn is due.
- Does not post a new automated wild lion while an active wild lion exists in the guild.
- Prefers active spawn-boost channel effects, then active channels from the same 60-minute and 5-message activity pattern.
- If no eligible channel is available, schedules the next spawn window without posting.

## Maintenance Mode

Maintenance mode is controlled by `/botadmin maintenance`.

Current behavior:

- `src/bot/events/interactionCreate.ts` blocks normal users from slash commands and practice buttons while maintenance mode is enabled.
- `src/bot/events/messageCreate.ts` blocks normal users before `~grab`, lion `~` commands, channel activity recording, and message XP.
- Users with Manage Guild can continue using commands during maintenance.
- Normal users who send a `~`-prefixed message receive the configured maintenance notice.
- Practice, red envelope, and wild lion schedulers skip public scheduled posts while maintenance mode is enabled.
- `/botadmin reloadpresence` reapplies presence from the current maintenance state.

Use maintenance mode for local/dev recovery windows, state cleanup, or command testing where normal member actions should pause temporarily.

## Admin-Only Workflows

Admin slash commands use Manage Guild permissions and also perform runtime permission checks.

Main workflows:

- `/botadmin status`: inspect maintenance state.
- `/botadmin health`: run the development health checklist.
- `/botadmin reloadpresence`: reapply Discord presence.
- `/botadmin maintenance`: enable or disable maintenance mode.
- `/redenvelope configure`, `/redenvelope pause`, `/redenvelope dropnow`, `/redenvelope clearopen`, `/redenvelope status`: configure, pause, force, clear, and inspect red envelope automation.
- `/lionadmin configure`, `/lionadmin pause`, `/lionadmin resume`, `/lionadmin dropnow`, `/lionadmin clearspawn`, `/lionadmin cleareffects`, `/lionadmin grantitem`, `/lionadmin species ...`, `/lionadmin item ...`, `/lionadmin status`: manage wild lion automation, catalog state, active spawns, channel effects, and item grants.
- `/practice configure`, `/practice start`, `/practice end`: configure scheduled practice posts, start a manual session, and close the active session.
- `/coins ...` and `/xp ...`: adjust member balances and XP.

Admin setup and status replies should stay ephemeral unless a command intentionally posts public gameplay content, such as creating a red envelope or forcing a wild lion spawn.

## Migrations

SQLite is the current database provider. Committed migrations are applied with:

```sh
npm run prisma:migrate:deploy
```

Use `npm run prisma:migrate:dev` only when intentionally creating a new local migration for a schema change. Schema changes must also update [DATA_MODEL.md](DATA_MODEL.md).

If Prisma reports a missing table error such as `P2021`, stop the bot, close Prisma Studio if it is open, apply migrations, regenerate the client, and restart the bot.

If SQLite reports a locked database, stop processes that may hold the database open, especially the bot dev server or Prisma Studio.

## Health Checks

Use `/botadmin health` in the test guild when local behavior looks wrong or after setup changes.

The current health report checks:

- Discord client readiness
- guild context
- database connectivity
- user profile table access
- maintenance mode state
- practice schedule and active session state
- red envelope configuration and open envelope state
- lion spawn configuration and active wild spawn state

The report can show `healthy`, `warning`, or `error`. Warnings often mean optional automation is paused, unconfigured, or currently has active public state. Errors should be investigated before relying on the bot for local testing.
