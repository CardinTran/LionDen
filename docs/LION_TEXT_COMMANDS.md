# Lion Text Commands

## Purpose

LionDen uses `~` text commands for public lion creature gameplay and red envelope claiming. Slash commands remain documented in [COMMANDS.md](COMMANDS.md).

This document describes the current public text-command surface only. It does not include officer-only slash commands such as `/lionadmin` or `/redenvelope`.

## Entry Point

- Compatibility entry point: `src/bot/messages/lion-creatures.ts`
- Active router: `src/bot/messages/lions/index.ts`
- Command allow-list and parser: `src/bot/messages/lions/parsing.ts`
- Handler modules: `src/bot/messages/lions/*.handler.ts`
- Discord event route: `src/bot/events/messageCreate.ts`

The message-create event handles maintenance checks first, then `~grab`, then the lion command router. Non-command messages can still record channel activity and earn message XP after the command routes decline them.

## General Commands

- `~grab`: claims an open red envelope in the current channel. This is routed directly from `src/bot/events/messageCreate.ts` and uses helpers in `src/bot/commands/redenvelope.ts`; it is not part of the lion creature router.
- `~help`: shows the public lion gameplay command guide. Handler: `src/bot/messages/lions/help.handler.ts`.

Successful `~grab` claims record weekly challenge progress and 1 House point on a best-effort basis when the member belongs to a House.

## Shop and Inventory

Handlers:

- `src/bot/messages/lions/shop.handler.ts`
- `src/bot/messages/lions/inventory.handler.ts`
- `src/bot/messages/lions/use-item.handler.ts`

Service and formatter area:

- `src/features/lions/lion-creature.service.ts`
- `src/features/lions/lion-formatting.ts`

Commands:

- `~shop`: shows available lion shop items.
- `~buy <item> [quantity]`: buys one or more shop items with coins. Item names are normalized by the lion service, so command input can use item keys such as `basic-ball`.
- `~bag`: shows the caller's lion item inventory.
- `~use <item>`: activates a usable lion item in the current channel when that item has a channel effect.
- `~use training-snack <lion>`: gives a training XP item to one owned lion.

Catching balls are not activated with `~use`; they are consumed by `~catch <ball>`.

## Catching and Training

Handlers:

- `src/bot/messages/lions/catch.handler.ts`
- `src/bot/messages/lions/training.handler.ts`

Commands:

- `~catch <ball>`: attempts to catch the active wild lion in the current channel. If no ball is provided, the handler defaults to `basic-ball`.
- `~train <lion>`: trains one owned lion by ID, public code, slug, or name and applies the current training cooldown.

Successful catches and training actions also record weekly challenge progress on a best-effort basis. They also record 1 House point when the member belongs to a House.

## Roster and Identity

Handlers:

- `src/bot/messages/lions/roster.handler.ts`
- `src/bot/messages/lions/nickname.handler.ts`
- `src/bot/messages/lions/release.handler.ts`

Commands:

- `~lions`: shows the caller's owned lion roster and saved team markers.
- `~lion <id, code, slug, or name>`: inspects one owned lion.
- `~nickname <lion> <name>`: sets an owned lion's nickname.
- `~nickname <lion> clear`: clears an owned lion's nickname.
- `~release <lion> confirm`: releases one owned lion for coins.

`~release <lion>` without `confirm` shows the release preview first.

## Team and Battles

Handlers:

- `src/bot/messages/lions/team.handler.ts`
- `src/bot/messages/lions/battle.handler.ts`

Commands:

- `~team`: shows the caller's saved battle team.
- `~team set <lion1> <lion2> <lion3>`: saves up to three owned lions as the caller's battle team.
- `~team clear`: clears the caller's saved battle team.
- `~duel @user`: starts a button-based 1v1 lion duel prototype using each trainer's lead saved team lion. Duels are in-memory active state and do not write to automatic team battle history or trainer stats yet.
- `~battle @user`: challenges another member's saved team.
- `~battle training`: runs an automatic Training Hall battle against the NPC team.
- `~battle accept [@user]`: accepts a pending lion battle challenge.
- `~battle decline [@user]`: declines a pending lion battle challenge.
- `~accept [@user]`: parsed as shorthand for the accept flow.
- `~decline [@user]`: parsed as shorthand for the decline flow.
- `~cancelbattle [@user]`: cancels a pending challenge sent by the caller.

The public help text currently points members to the `~battle accept` and `~battle decline` forms.

Completed `~battle training` runs record weekly challenge progress and 2 House points on a best-effort basis. Completed interactive `~duel` sessions record 2 House points for each participant. Automatic `~battle @user` team battles do not currently award House points.

## Battle History and Leaderboards

Handlers:

- `src/bot/messages/lions/battle-history.handler.ts`
- `src/bot/messages/lions/leaderboards.handler.ts`

Commands:

- `~battlehistory [@user]`: shows recent team battles, optionally filtered to a mentioned user.
- `~battlestats [@user]`: shows trainer battle stats for the caller or mentioned user.
- `~battleboard`: shows top lion battle trainers.
- `~toplions`: shows top owned lions.
- `~lionboard`: alias for `~toplions`.
- `~rarecatches`: shows recent rare or high-level catches.

## Wild Lion Status

Handler:

- `src/bot/messages/lions/wild.handler.ts`

Command:

- `~wild`: shows active wild lions and their channel locations.

## Maintenance Notes

Maintenance mode is checked in `src/bot/events/messageCreate.ts` before `~grab` and before the lion command router.

Current behavior:

- Normal users are blocked from `~` commands while maintenance mode is enabled.
- Users with Manage Guild can continue using `~` commands during maintenance mode.
- Normal users who type any `~`-prefixed message during maintenance receive the configured maintenance notice.
- Non-`~` messages from normal users do not proceed to channel activity or message XP while maintenance mode is enabled.

See [OPERATIONS.md](OPERATIONS.md) for the broader maintenance-mode conventions.

## Adding a New `~` Command

Use [CONTRIBUTING_COMMANDS.md](CONTRIBUTING_COMMANDS.md) for the implementation checklist. At minimum, new lion text commands should update the parser allow-list, add or extend a handler under `src/bot/messages/lions/`, add focused routing or handler coverage, and update this document plus the in-bot `~help` text when the command is public.
