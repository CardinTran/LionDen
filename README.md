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

Phase 0 foundation is in progress. This repo currently includes:

- project tooling and scripts
- environment validation
- a minimal Discord client bootstrap
- slash command registration script
- `/ping` command
- starter docs and CI

## Quick Start

1. Copy `.env.example` to `.env`.
2. Fill in your Discord application values.
3. Install dependencies with `npm install`.
4. Generate Prisma client with `npm run prisma:generate`.
5. Register commands in your test server with `npm run discord:register`.
6. Start the bot with `npm run dev`.

## Scripts

- `npm run dev`: run the bot in watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm run lint`: run ESLint
- `npm run typecheck`: run the TypeScript checker
- `npm run test`: run unit tests
- `npm run discord:register`: register slash commands to the test guild

See [docs/PRODUCT_SPEC.md](/Users/cardintran/Documents/GitHub/LionDen/docs/PRODUCT_SPEC.md), [docs/COMMANDS.md](/Users/cardintran/Documents/GitHub/LionDen/docs/COMMANDS.md), and [docs/DEPLOYMENT.md](/Users/cardintran/Documents/GitHub/LionDen/docs/DEPLOYMENT.md) for the evolving product and operating notes.
