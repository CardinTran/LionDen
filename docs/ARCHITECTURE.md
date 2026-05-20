# Architecture

## Overview

LionDen is a TypeScript Discord bot built around a thin adapter layer and feature-oriented services.

Runtime flow:

1. `src/index.ts` connects Prisma and creates the Discord client.
2. `src/bot/discordClient.ts` creates the `discord.js` client and registers event handlers.
3. `src/bot/events/` handles `ready`, `interactionCreate`, and `messageCreate`.
4. Commands and message routers delegate business logic to `src/features/`.
5. Feature services read and write through Prisma models defined in `prisma/schema.prisma`.

## Module Layout

### Entrypoints

- `src/index.ts`: bot startup
- `src/scripts/registerCommands.ts`: guild slash command registration

### Discord Adapter Layer

- `src/bot/discordClient.ts`: client composition root
- `src/bot/events/ready.ts`: startup initialization and scheduler boot
- `src/bot/events/interactionCreate.ts`: slash commands and practice buttons
- `src/bot/events/messageCreate.ts`: maintenance checks, `~grab`, lion text commands, activity, XP
- `src/bot/commands/`: slash command adapters
- `src/bot/messages/lion-creatures.ts`: lion text-command router
- `src/bot/presence.ts`: bot presence updates

### Domain Services

- `src/features/admin/`: guild bot controls and maintenance mode
- `src/features/economy/`: coins, daily rewards, red envelopes, channel activity
- `src/features/lions/`: lion ownership, spawning, items, battles, formatting, seed data
- `src/features/practice/`: practice sessions, scheduling, RSVP and attendance
- `src/features/profiles/`: user profile reads and writes
- `src/features/progression/`: XP awards, level math, admin adjustments

### Shared Infrastructure

- `src/lib/prisma.ts`: Prisma client singleton
- `src/lib/logger.ts`: logging
- `src/config/env.ts`: environment validation with Zod

## Design Principles

- Keep Discord transport logic near Discord types.
- Keep domain logic in feature services.
- Keep formatting helpers separate from state-changing services where the repo already does so.
- Prefer direct composition over framework-heavy inversion.

## Event Flow

### Ready

- Ensures guild bot config exists
- Applies presence
- Starts practice, red envelope, and lion spawn schedulers

### Interaction Create

- Applies maintenance-mode restrictions
- Routes practice button interactions
- Routes slash commands through the command registry

### Message Create

- Applies maintenance-mode restrictions for text commands
- Handles the `~grab` red envelope flow
- Routes lion `~` commands
- Records channel activity
- Awards message XP

## Command Structure

- Shared command typing lives in `src/bot/commands/types.ts`.
- The registry is built in `src/bot/commands/index.ts`.
- Individual command files are adapters that validate Discord input and call services.

## Persistence Boundary

- Prisma is the only database access layer.
- Feature services are the main callers of Prisma.
- Schema changes should be reflected in `docs/DATA_MODEL.md`.
