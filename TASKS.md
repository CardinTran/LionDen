# TASKS

## Current

- [x] Add agent-oriented repository guidance in `AGENTS.md`
- [x] Add a high-level implementation plan in `PLAN.md`
- [x] Add a working task list in `TASKS.md`
- [x] Add architecture documentation in `docs/ARCHITECTURE.md`
- [x] Add data model documentation in `docs/DATA_MODEL.md`
- [x] Move the shared `SlashCommand` type into `src/bot/commands/types.ts`
- [x] Split Discord event handling into dedicated event files
- [ ] Keep docs updated as new bot domains are added

## Next Useful Follow-Ups

- [x] Add tests around Discord event registration and routing seams
- [x] Add event-routing tests for `ready`, `interactionCreate`, and `messageCreate`
- [x] Decompose `src/bot/messages/lion-creatures.ts` into smaller routing modules without changing command behavior
- [x] Add focused tests for separated non-battle lion message handlers
- [x] Add focused tests for read-only lion message handlers
- [ ] Document the lion text-command surface separately from slash commands
- [ ] Add a short contributor guide for introducing a new command or scheduler
- [ ] Document operational conventions such as scheduler timing, maintenance-mode expectations, and admin-only workflows
- [ ] Prototype interactive 1v1 turn-based lion duels without changing existing automatic team battles
