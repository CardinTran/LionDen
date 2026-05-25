# Deployment Notes

## Local Development

LionDen is still in development. Active development happens on `develop`; do not treat these notes as a full production deployment guide.

1. Copy `.env.example` to `.env`.
2. Fill in the Discord application values in `.env`.
3. Set `DATABASE_URL` for the local SQLite database.
4. Install dependencies with `npm install`.
5. Run `npm run prisma:generate`.
6. Apply committed database migrations with `npm run prisma:migrate:deploy`.
7. Register slash commands with `npm run discord:register`.
8. Start the bot with `npm run dev`.
9. Inspect local data with `npm run prisma:studio` when needed.

For a fuller local workflow, see [DEV_CHECKLIST.md](DEV_CHECKLIST.md).

## Database Readiness

When Prisma reports `P2021` or a missing table such as `main.LionBattleRecord`, the configured database is usually behind the checked-in migrations. Stop the bot and Prisma Studio, run `npm run prisma:migrate:deploy`, then start the bot again.

If SQLite reports that the database is locked, close Prisma Studio, stop the bot, and retry the migration.

## MVP Deployment Goals

- run 24/7 with restart behavior
- keep secrets outside the repo
- persist database state
- document migrations and backups

## Later Phase Work

Production deployment, Docker setup, and hosting runbooks are intentionally deferred until the project is ready for that scope.
