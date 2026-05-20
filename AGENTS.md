# AGENTS

## Purpose

LionDen is a Discord bot for a lion dance team. The repository is organized around a small Discord adapter layer, Prisma-backed feature services, and a SQLite data model.

## Working Rules

- Preserve existing runtime behavior unless a task explicitly asks for a change.
- Prefer small, direct edits over broad rewrites.
- Keep Discord-specific code in `src/bot/`.
- Keep business logic and data access in `src/features/`.
- Keep persistence shape in `prisma/schema.prisma`.
- Follow the existing TypeScript style:
  - ESM imports with `.js` extensions
  - named exports
  - concise helper functions near their usage
  - explicit return types on exported functions when helpful
- Reuse existing services before adding new abstractions.

## Repo Map

- `src/index.ts`: process entrypoint
- `src/scripts/registerCommands.ts`: slash command registration entrypoint
- `src/bot/`: Discord client, commands, event handlers, presence, message-command routers
- `src/features/`: domain services by area (`admin`, `economy`, `lions`, `practice`, `profiles`, `progression`)
- `src/lib/`: shared infrastructure such as Prisma and logging
- `src/config/`: environment parsing
- `prisma/`: schema and migrations
- `tests/`: Vitest coverage for commands and services
- `docs/`: product and engineering reference docs

## Architecture Notes

- `src/bot/discordClient.ts` is the composition root for the Discord client.
- `src/bot/events/` contains event registration by Discord event name.
- `src/bot/commands/` contains slash command adapters and shared command typing.
- `src/bot/messages/lion-creatures.ts` handles `~`-prefixed lion text commands.
- Feature services own behavior; bot modules should mostly validate Discord context and call services.

## Data Notes

- SQLite is the current database provider.
- Prisma models cover profiles, coins, daily claims, red envelopes, practice sessions, lion ownership, lion battles, shop inventory, and guild-level configuration.
- New persistence changes should update both `prisma/schema.prisma` and the related docs in `docs/DATA_MODEL.md`.

## Common Commands

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run discord:register`

## Safe Change Strategy

1. Read the relevant command/event/service files first.
2. Trace the feature into the matching Prisma model when data is involved.
3. Prefer moving code over rewriting code when reorganizing.
4. Run typecheck and tests after changes.
