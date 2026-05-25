# Development Checklist

Use this checklist when setting up LionDen locally, pulling new changes, preparing a PR, or debugging a development environment.

## Branch Rule

- Use `develop` for active development unless a task explicitly says otherwise.
- Do not merge into `main` unless that is the explicit task.
- Keep changes small enough to review as a focused PR.

## First-Time Setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in the Discord application values listed in `.env.example`.
4. Set the local SQLite database URL listed in `.env.example`.
5. Install dependencies:
   ```sh
   npm install
   ```
6. Generate the Prisma client:
   ```sh
   npm run prisma:generate
   ```
7. Apply committed migrations:
   ```sh
   npm run prisma:migrate:deploy
   ```
8. Register guild slash commands:
   ```sh
   npm run discord:register
   ```
9. Start the bot:
   ```sh
   npm run dev
   ```

## After Pulling Changes

1. Check whether package files changed.
   - If yes, run `npm install`.
2. Apply committed migrations:
   ```sh
   npm run prisma:migrate:deploy
   ```
3. Regenerate the Prisma client:
   ```sh
   npm run prisma:generate
   ```
4. Register slash commands again if files in `src/bot/commands/` changed:
   ```sh
   npm run discord:register
   ```
5. Run a quick verification pass:
   ```sh
   npm run typecheck
   npm run test
   ```

## Before Opening a PR

Run the full local validation set:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx prisma validate
```

Also verify docs when relevant:

- Update `docs/COMMANDS.md` when command names, behavior, permissions, or output changes.
- Update `docs/DATA_MODEL.md` when Prisma models or relationships change.
- Update `docs/DEPLOYMENT.md` or this checklist when setup or migration steps change.
- Update `AGENTS.md` when repo workflow expectations change.

## Debugging Checklist

When the bot behaves unexpectedly:

1. Confirm `.env` exists and required values are set.
2. Confirm the bot is running from `develop` or the intended feature branch.
3. Confirm slash commands were registered with `npm run discord:register`.
4. Confirm migrations were applied with `npm run prisma:migrate:deploy`.
5. Run `/botadmin health` in the test guild.
6. Check console logs for command, scheduler, Discord, or Prisma failures.
7. Inspect the database with:
   ```sh
   npm run prisma:studio
   ```
8. Stop the bot and Prisma Studio before retrying migrations if SQLite reports a lock.

## Health Check Expectations

`/botadmin health` should help developers quickly inspect:

- Discord client readiness
- database connectivity
- maintenance mode status
- practice schedule configuration
- red envelope configuration
- lion spawn configuration
- open red envelopes
- active lion spawns
- active practice sessions
- overall status: healthy, warning, or error

Health output should be useful even when part of the system is misconfigured. A failed check should not prevent the rest of the checklist from rendering when partial results are available.

## Prisma Troubleshooting

If Prisma reports missing table errors such as `P2021` or `main.SomeTable`, the database is usually behind the checked-in migrations.

Recommended fix:

1. Stop the bot.
2. Stop Prisma Studio if it is open.
3. Run:
   ```sh
   npm run prisma:migrate:deploy
   npm run prisma:generate
   ```
4. Restart the bot.

If SQLite reports that the database is locked, close any process that may be holding the database open, especially the bot dev server or Prisma Studio, then retry the migration.

## Logging Expectations

Development logs should be helpful but not noisy.

Log useful events such as:

- bot startup and ready state
- command execution failures
- scheduler startup or failures
- admin actions that change state
- health check failures
- database or migration readiness errors

Do not log:

- bot tokens
- full environment values
- secrets
- unnecessary every-message chatter that does not trigger a command or reward
