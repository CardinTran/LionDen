# Deployment Notes

## Local Development

LionDen is still in development. Active development happens on `develop`; do not treat these notes as a full production deployment guide.

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run prisma:generate`.
4. Apply committed database migrations with `npm run prisma:migrate:deploy`.
5. Register slash commands with `npm run discord:register`.
6. Start the bot with `npm run dev`.

For a fuller local workflow, see [DEV_CHECKLIST.md](DEV_CHECKLIST.md).

## Database Readiness

When Prisma reports `P2021` or a missing table such as `main.LionBattleRecord`, the configured database is behind the checked-in migrations. Stop the bot, run `npm run prisma:migrate:deploy`, then start it again.

If SQLite reports that the database is locked, stop the bot and close Prisma Studio before retrying migrations.

## MVP Deployment Goals

- run 24/7 with restart behavior
- keep secrets outside the repo
- persist database state
- document migrations and backups

## Later Phase Work

Production deployment, Docker setup, and hosting runbooks are intentionally deferred until the project is ready for that scope.
