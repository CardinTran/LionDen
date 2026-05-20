# PLAN

## Goal

Make LionDen easier for AI agents and new contributors to navigate without changing behavior.

## Current Plan

1. Document the current repository structure and data model.
2. Keep the Discord client entrypoint small and use event-specific files under `src/bot/events/`.
3. Keep slash command shared types in `src/bot/commands/types.ts`.
4. Preserve the existing boundary where Discord adapters call feature services.
5. Verify parity with typecheck and tests after structural changes.

## Non-Goals

- No feature redesign
- No command behavior changes
- No schema changes
- No new framework or architectural layer

## Desired Steady State

- New contributors can find the runtime flow from `src/index.ts` quickly.
- Agents can identify where to edit commands, events, services, and data models without broad repo exploration.
- Documentation stays close to the current code instead of describing a future rewrite.
