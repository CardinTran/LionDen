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

- [ ] Add tests around Discord event registration and routing seams
- [ ] Add event-routing tests for `ready`, `interactionCreate`, and `messageCreate`
- [ ] Document the lion text-command surface separately from slash commands
- [ ] Decompose `src/bot/messages/lion-creatures.ts` into smaller routing modules without changing command behavior
- [ ] Add a short contributor guide for introducing a new command or scheduler
