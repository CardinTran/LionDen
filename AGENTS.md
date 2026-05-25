# AGENTS

## Purpose

LionDen is a Discord bot for a lion dance team. The repository is organized around a small Discord adapter layer, Prisma-backed feature services, and a SQLite data model.

## Working Rules

- Work from `develop` unless a task explicitly says otherwise.
- Do not merge into `main` unless a task explicitly asks for a release or merge.
- Preserve existing runtime behavior unless a task explicitly asks for a change.
- Prefer small, direct edits over broad rewrites.
- Keep Discord-specific code in `src/bot/`.
- Keep business logic and data access in `src/features/`.
- Keep persistence shape in `prisma/schema.prisma`.
- Do not overbuild deployment or hosting infrastructure unless the task asks for it.
- Do not log tokens, secrets, or full environment values.
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
- When migrations are added, keep local development instructions aligned with the migration workflow.

## Documentation Rules

- Update `docs/COMMANDS.md` when command behavior, names, permissions, or output changes.
- Update `docs/LION_TEXT_COMMANDS.md` when public `~` text-command behavior changes.
- Update `docs/CONTRIBUTING_COMMANDS.md` when command or scheduler contribution workflow changes.
- Update `docs/DATA_MODEL.md` when Prisma models or relationships change.
- Update `docs/OPERATIONS.md`, `docs/DEPLOYMENT.md`, or `docs/DEV_CHECKLIST.md` when setup, scheduler, maintenance, migration, or debugging steps change.
- Update this file when the repo workflow expectations change.

## Common Commands

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run discord:register`
- `npm run prisma:migrate:deploy`
- `npm run prisma:generate`

## Safe Change Strategy

1. Read the relevant command/event/service files first.
2. Trace the feature into the matching Prisma model when data is involved.
3. Prefer moving code over rewriting code when reorganizing.
4. Keep changes focused and PR-sized.
5. Run lint, typecheck, tests, build, and Prisma validation before finishing when practical.
6. Document any validation command that cannot be run or fails for a pre-existing reason.
7. Run typecheck and tests after changes.

## Task Completion Notes

- When a task is completed, mark the requested work as done in the final response or task notes.
- Before finalizing, pause for a deeper next-step review: consider the changed area, nearby risks, test gaps, and what would most improve the project next without expanding the current scope.
- Put the best next move into the follow-ups section, along with any necessary unresolved risks or validation gaps.
- Keep follow-ups practical and PR-sized. Do not suggest merging to `main`, production deployment, or broad rewrites unless the task explicitly calls for them.

## GitHub Workflow

Use a professional branch-based workflow for development tasks.

- Do not commit directly to `main` or `develop`.
- Create a new branch for each task from `develop`.
- Use short, descriptive branch names:
  - `feat/profile-command`
  - `fix/daily-cooldown`
  - `refactor/event-handlers`
  - `docs/agent-guidance`
  - `test/practice-service`

During development:

- Commit changes iteratively at logical checkpoints.
- Keep commits focused on one purpose.
- Use clear conventional commit messages:
  - `feat: add profile command`
  - `fix: correct daily reward cooldown`
  - `refactor: split message event handling`
  - `docs: update data model notes`
  - `test: add practice service coverage`

Before opening a pull request:

- Run relevant checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Review `git status` and confirm only intended files are included.
- Do not commit `.env`, secrets, `node_modules/`, generated database files, or unrelated changes.

Pull requests:

- Open PRs into `develop` unless explicitly told otherwise.
- Use a clear PR title following the main change type:
  - `feat: add profile command`
  - `fix: repair red envelope claim flow`
  - `refactor: split Discord event handlers`
- Include a concise PR summary with:
  - what changed
  - why it changed
  - tests/checks run
  - follow-up work, if any
- Do not merge the PR unless explicitly instructed.
