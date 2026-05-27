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
- `/houseadmin create`, `/houseadmin assign`, `/houseadmin remove`, `/houseadmin rename`, `/houseadmin deactivate`: create Houses, move members, remove memberships, and retire Houses without deleting history.
- `/houseadmin points add` and `/houseadmin points remove`: add signed ledger entries for officer corrections. These commands never mutate a stored House total directly.
- `/houseadmin recap configure`, `/houseadmin recap status`, `/houseadmin recap postnow`, `/houseadmin recap disable`: configure, inspect, manually post, and pause Weekly House Recaps.
- `/houseadmin badge sync` and `/houseadmin badge grant`: sync default House badge definitions and manually grant cosmetic House badges.

Admin setup and status replies should stay ephemeral unless a command intentionally posts public gameplay content, such as creating a red envelope or forcing a wild lion spawn.

## Team Houses / House Cup Operations

House setup:

1. Create one or more active Houses with `/houseadmin create`.
2. Let members self-select with `/house join`, or use `/houseadmin assign` for officer-managed rosters.
3. Use `/house leaderboard` to verify House Cup standings.
4. Use `/house roster` and `/house profile` to inspect memberships and point totals.

House points are ledger-based. Current hook-based point sources create House point entries only when the member belongs to an active House:

- Practice attendance: 10 House points after `/practice end` successfully applies the attendance XP reward.
- Weekly challenge completion: 5 House points when a weekly challenge is newly completed.
- Red envelope claim: 1 House point after a successful `~grab`.
- Wild lion catch: 1 House point after a successful `~catch`.
- Lion training: 1 House point after a successful `~train`.
- Training Hall battle: 2 House points after a completed `~battle training`.
- Interactive duel completion: 2 House points for each participant after a completed `~duel`.

House point hooks are best-effort. If House point recording fails, LionDen logs a warning and the original action continues. Members without Houses are treated as a no-op for point hooks. Hook source IDs prevent duplicate awards when the same completed action is retried.

Message activity does not currently award House points. That remains a future design item because spam prevention needs a capped, intentional mechanism.

Weekly House Recaps turn the House point ledger into a weekly social summary:

- `/houseadmin recap configure` enables automatic recaps in a channel. `weekday` uses `0` for Sunday through `6` for Saturday, and the default schedule is Sunday 18:00 America/Chicago.
- `/houseadmin recap status` shows whether recaps are enabled, the configured channel and schedule, the current week key, whether that week has already posted, and the last post.
- `/houseadmin recap postnow` posts the current recap to the configured channel or a provided channel. It skips the current week if already posted unless `force` is true.
- `/houseadmin recap disable` pauses automatic posting without deleting config or post history.
- The scheduler checks enabled recap configs once per minute and posts only when the configured local weekday/hour/minute is due.
- Recap week keys reuse the weekly challenge ISO-style UTC week labels, such as `2026-W22`.
- Normal recap posts are de-duplicated by `guildId` + `weekKey` in `HouseRecapPost`.
- A forced manual repost can send another message, but it does not create a second normal posted-week record.

House badges make weekly accomplishments durable:

- Default badge definitions are synced with `/houseadmin badge sync`; `/houseadmin badge grant` also syncs defaults before granting.
- Official weekly recap posts award House badges after the recap post is recorded.
- Forced recap reposts and skipped duplicate recap posts do not start another badge award cycle.
- Weekly badge awards are idempotent by guild, user, badge key, and week key.
- Current recap awards include House Champion for current members of the winning House, Weekly Contributor for members who earned positive House points, and category badges for practice, red envelope, lion activity, and battle/duel point contributors.
- House badges are cosmetic only. They do not change House points, XP, coins, combat, economy, or challenge rewards.
- If badge awarding fails after a recap posts, LionDen logs a warning and keeps the recap message posted.

Manual corrections:

- Use `/houseadmin points add` for positive corrections.
- Use `/houseadmin points remove` for negative corrections.
- Include a reason that is useful for future audit.
- Leaving or removing a House membership does not delete historical ledger rows.

Troubleshooting missing House points:

- Confirm the member had a House membership before the relevant activity completed.
- Confirm the House is still active.
- Check `/botadmin health`; the Houses section warns when no active Houses are configured.
- Check logs for House point hook warnings with `guildId`, `userId`, `sourceType`, and `sourceId`.
- If no recap posted, check `/houseadmin recap status`, confirm the channel is configured, and review logs for scheduler warnings.
- If a manual recap says it was skipped, the current week already has a normal post recorded.
- If House badges are missing, run `/houseadmin badge sync`, then check `/botadmin health` for enabled House badge definitions.
- If a badge did not appear after a recap, confirm the user earned positive House points or belonged to the winning House during that recap week.
- Duplicate badge awards are expected to be skipped; repeated recap processing should not create another copy for the same week.
- If a recap posted but badges did not award, review logs for `Weekly House Recap badge awarding failed`.

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
- active House table access and configured House count
- enabled House badge definition count

The report can show `healthy`, `warning`, or `error`. Warnings often mean optional automation is paused, unconfigured, or currently has active public state. Errors should be investigated before relying on the bot for local testing.
