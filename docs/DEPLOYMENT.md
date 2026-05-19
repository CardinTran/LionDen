# Deployment Notes

## Local Development

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run prisma:generate`.
4. Apply committed database migrations with `npm run prisma:migrate:deploy`.
5. Register slash commands with `npm run discord:register`.
6. Start the bot with `npm run dev`.

When Prisma reports `P2021` or a missing table such as `main.LionBattleRecord`, the configured database is behind the checked-in migrations. Stop the bot, run `npm run prisma:migrate:deploy`, then start it again.

## MVP Deployment Goals

- run 24/7 with restart behavior
- keep secrets outside the repo
- persist database state
- document migrations and backups

## Later Phase Work

Production deployment, Docker setup, and hosting runbooks are intentionally deferred until Phase 7.
