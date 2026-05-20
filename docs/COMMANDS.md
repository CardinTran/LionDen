# Command Reference

## Slash Commands

### Public

- `/ping`: health check that returns latency information
- `/profile`: shows the caller's level, XP, coins, and progress to the next level
- `/leaderboard`: shows the top 10 server members ranked by XP
- `/daily`: claims the fixed daily coin reward once per Central Time calendar day

### Officer and Admin

- `/redenvelope create`: posts a manual red envelope in the current channel
- `/redenvelope configure`: configures automated random red envelope drops
- `/redenvelope pause`: pauses automated red envelope drops
- `/redenvelope dropnow`: forces an immediate configured drop
- `/redenvelope clearopen`: clears stale open red envelopes
- `/redenvelope status`: shows red envelope automation state
- `/lionadmin configure`: configures automated wild lion spawn timing
- `/lionadmin dropnow`: forces a wild lion spawn in the current channel
- `/lionadmin clearspawn`: expires active wild lion spawns in the current channel
- `/lionadmin cleareffects`: clears active lion item effects in the current channel
- `/lionadmin grantitem`: grants a lion item to a member
- `/lionadmin species enable/tune`: enables, disables, or tunes a species
- `/lionadmin item enable/tune`: enables, disables, or tunes a shop item
- `/lionadmin pause`: pauses automated wild lion spawns
- `/lionadmin resume`: resumes automated wild lion spawns
- `/lionadmin status`: shows lion spawn automation state
- `/botadmin status`: shows maintenance-mode state
- `/botadmin health`: runs a lightweight bot and database health check
- `/botadmin reloadpresence`: reapplies the current bot presence
- `/botadmin maintenance`: enables or disables maintenance mode and updates the public message
- `/coins add`: adds coins to a member
- `/coins remove`: removes coins from a member, clamped at zero
- `/xp add`: adds XP to a member
- `/xp remove`: removes XP from a member, clamped at zero
- `/practice start`: starts a manual practice session
- `/practice configure`: sets the scheduled practice channel
- `/practice end`: ends the active practice session and awards attendance XP

## `~` Text Commands

### General

- `~grab`: claims an open red envelope in the current channel

### Lion Commands

- `~shop`: shows lion items that can be bought with coins
- `~buy <item> [quantity]`: buys lion items such as balls and spawn modifiers
- `~bag`: shows the caller's lion item inventory
- `~help`: shows the public lion command guide
- `~use <item>`: activates a usable lion item in the current channel
- `~use training-snack <lion>`: gives one owned lion bonus XP from inventory
- `~catch <ball>`: attempts to catch the active wild lion in the current channel
- `~train <lion>`: trains one owned lion for XP
- `~nickname <lion> <name>`: sets a compact nickname for one owned lion
- `~nickname <lion> clear`: clears that lion's nickname
- `~team`: shows the caller's saved battle team
- `~team set <lion1> <lion2> <lion3>`: saves up to 3 owned lions as the caller's battle team
- `~team clear`: clears the caller's battle team
- `~battle @user`: challenges another member's saved team
- `~accept [@user]`: accepts a pending lion battle challenge and resolves the battle
- `~decline [@user]`: declines a pending lion battle challenge
- `~cancelbattle [@user]`: cancels a pending challenge you sent
- `~battle training`: runs a quick Training Hall PvE battle against a scaled bot team
- `~battlehistory [@user]`: shows recent recorded team battles
- `~battlestats [@user]`: shows win/loss stats for a trainer
- `~battleboard`: shows the top lion battle trainers in the server
- `~toplions` or `~lionboard`: shows the top 10 strongest owned lions in the server
- `~rarecatches`: shows recent rare or high-level catches in the server
- `~lions`: shows the caller's caught lion roster
- `~lion <id, code, slug, or name>`: inspects one caught lion owned by the caller
- `~wild`: shows active wild lions and their channel locations

## Scheduler and Interaction Notes

- Practice scheduler posts RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time.
- Practice scheduler posts attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time.
- Practice uses separate RSVP and attendance button posts.
- Automated red envelope drops target the most active eligible channel from recent message activity, with fallback channel behavior when none qualify.
- Wild lion spawns are driven by the lion spawn scheduler and channel-level lion effects.

## Current Lion Rules

- users cannot buy lions directly from the shop
- users buy catch and spawn-related items with coins
- public gameplay commands stay visible in guild text channels
- admin lion controls live under `/lionadmin` and require Manage Server permission
- global bot controls live under `/botadmin` and require Manage Server permission
- public `~help` intentionally does not list officer-only slash commands
- wild lions can spawn in active channels through the lion spawn scheduler
- wild lions spawn with encounter levels, and caught lions preserve that level
- rare or high-level wild spawns and catches get notable public text
- only one active wild lion may exist in a channel at a time
- catches consume the selected ball
- catch success uses the lion species base catch rate plus the selected ball modifier, with a small high-level catch penalty
- caught lions become persistent user-owned creatures
- owned lions can have validated nicknames for public display
- owned lions keep stable internal Discord user IDs, while public output uses display names
- training awards explicit lion XP and shows level-up progress
- training snacks are consumable utility items that award lion XP without using the normal training cooldown
- activity lures make a channel preferred for the next automated wild spawn
- rare lures boost rare, epic, and legendary spawn weights in the channel
- level lures raise wild encounter levels in the channel
- battle teams are persistent per guild and user and can contain 1 to 3 owned lions
- team battles send out team slot 1 first, then the next slot when a lion faints
- public PvP battles use a short persisted challenge acceptance flow before resolving
- quick battles use speed, move power, type matchups, derived stats, battle records, and battle XP cooldowns
- team battle starts are cooldown-limited per recent participant pair to reduce spam
- only lions that participate in a team battle receive battle XP
- Training Hall battles use the same battle engine against a generated NPC team
- battle stats and battle boards are guild-scoped and derived from recorded battle history
- species have readable public codes such as `L001`, plus internal database IDs for persistence
- owned lion inspection shows nickname, acquisition source, type, ability, level, XP, and derived battle stats
