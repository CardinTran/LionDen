# LionDen

LionDen is a Discord bot for a lion dance team. The MVP focuses on meaningful participation, visible progression, and simple officer tools instead of a generic meme or gambling bot.

## Stack

- Node.js
- TypeScript
- discord.js v14
- Prisma
- SQLite for MVP
- Vitest
- Docker and GitHub Actions later in the roadmap

## Current Phase

Active development happens on `develop`. This repo currently includes:

- project tooling and scripts
- environment validation
- a minimal Discord client bootstrap
- slash command registration script
- `/ping` command
- persisted user profiles with `/profile`
- profile level-progress display using total XP thresholds
- message XP foundation with a persisted cooldown
- `/leaderboard` rankings by total XP
- admin XP adjustment commands
- admin coin adjustment commands
- red envelope foundation with manual create-and-claim flow
- random red envelope drops with activity-based channel targeting
- public `~grab` red envelope claims
- admin controls to pause random red envelope drops or force one immediately
- admin recovery control to clear stale open red envelopes
- automatic expiry and status visibility for open red envelopes
- lion creature foundation with shop items, wild spawns, catches, and roster commands
- practice sessions with separate RSVP and attendance posts plus weekly scheduling
- practice-end XP rewards for members marked `I'm Here`
- practice attendance history, streaks, and leaderboards for completed sessions
- officer-posted practice recaps for completed sessions
- cosmetic practice badges for consistent completed-practice attendance
- Team Houses / House Cup foundation with activity point hooks, Weekly House Recaps, and House badges
- coin balance foundation stored on user profiles
- `/daily` fixed coin reward with once-per-day claims
- starter docs and CI

## Quick Start

1. Copy `.env.example` to `.env`.
2. Fill in your Discord application values.
3. Install dependencies with `npm install`.
4. Generate Prisma client with `npm run prisma:generate`.
5. Apply committed database migrations with `npm run prisma:migrate:deploy`.
6. Register commands in your test server with `npm run discord:register`.
7. Start the bot with `npm run dev`.

After pulling new migrations, run `npm run prisma:migrate:deploy` before starting the bot so the local SQLite database has every table used by the current code.

## Scripts

- `npm run dev`: run the bot in watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm run lint`: run ESLint
- `npm run typecheck`: run the TypeScript checker
- `npm run test`: run unit tests
- `npm run discord:register`: register slash commands to the test guild
- `npm run prisma:migrate:deploy`: apply committed Prisma migrations to the configured database
- `npm run prisma:studio`: open the local Prisma database viewer

## Docs

- [Product spec](docs/PRODUCT_SPEC.md)
- [Next roadmap](docs/ROADMAP_NEXT.md)
- [Command reference](docs/COMMANDS.md)
- [Lion text commands](docs/LION_TEXT_COMMANDS.md)
- [Contributor command and scheduler guide](docs/CONTRIBUTING_COMMANDS.md)
- [Operations guide](docs/OPERATIONS.md)
- [Data model](docs/DATA_MODEL.md)
- [Deployment notes](docs/DEPLOYMENT.md)
- [Development checklist](docs/DEV_CHECKLIST.md)
- [Editing guide](docs/EDITING_GUIDE.md)
- [Agent guidance](AGENTS.md)
