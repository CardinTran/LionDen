# Deployment Notes

## Local Development

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run prisma:generate`.
4. Register slash commands with `npm run discord:register`.
5. Start the bot with `npm run dev`.

## MVP Deployment Goals

- run 24/7 with restart behavior
- keep secrets outside the repo
- persist database state
- document migrations and backups

## Later Phase Work

Production deployment, Docker setup, and hosting runbooks are intentionally deferred until Phase 7.
