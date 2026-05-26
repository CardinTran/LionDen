# Command Reference

## Slash Commands

### Public

- `/ping`: health check with round-trip latency
- `/profile`: show the caller's level, XP, coins, and progress
- `/leaderboard`: show top server members by XP
- `/daily`: claim the fixed daily coin reward
- `/weekly challenges`: show the caller's current weekly challenge progress
- `/weekly badges`: show the caller's earned LionDen badges
- `/house join`: join an active Team House
- `/house leave`: leave the caller's current Team House
- `/house profile`: show the caller's House profile, including weekly and lifetime House points
- `/house leaderboard`: show current House Cup standings
- `/house roster`: show members currently assigned to a House

### Officer and Admin

- `/botadmin status`: show maintenance-mode state
- `/botadmin health`: show an ephemeral development checklist for Discord readiness, database access, maintenance mode, practice, red envelopes, lion spawns, and Houses
- `/botadmin reloadpresence`: reapply presence from current state
- `/botadmin maintenance`: enable or disable maintenance mode and update the message
- `/coins add`: add coins to a member
- `/coins remove`: remove coins from a member, clamped at zero
- `/xp add`: add XP to a member
- `/xp remove`: remove XP from a member, clamped at zero
- `/redenvelope configure`: configure automated random red envelope drops
- `/redenvelope create`: post a manual red envelope in the current channel
- `/redenvelope pause`: pause automated red envelope drops
- `/redenvelope dropnow`: force one immediate automated drop
- `/redenvelope clearopen`: clear stale open red envelopes
- `/redenvelope status`: show red envelope automation state
- `/lionadmin configure`: configure automated wild lion spawn timing
- `/lionadmin dropnow`: force a wild lion spawn in the current channel
- `/lionadmin clearspawn`: expire active wild lion spawns in the current channel
- `/lionadmin cleareffects`: clear active lion item effects in the current channel
- `/lionadmin grantitem`: grant lion items to a member
- `/lionadmin species enable`: enable or disable a species
- `/lionadmin species tune`: tune species spawn weight or catch rate
- `/lionadmin item enable`: enable or disable a shop item
- `/lionadmin item tune`: tune shop item price or effect value
- `/lionadmin pause`: pause automated lion spawns
- `/lionadmin resume`: resume automated lion spawns
- `/lionadmin status`: show lion spawn automation state
- `/practice configure`: set the scheduled practice channel
- `/practice start`: start a manual practice session
- `/practice end`: end the active practice session and award attendance XP
- `/houseadmin create`: create a Team House
- `/houseadmin assign`: assign or move a member to a House
- `/houseadmin remove`: remove a member from their House
- `/houseadmin rename`: update House display details
- `/houseadmin deactivate`: deactivate a House so it cannot receive new public joins
- `/houseadmin points add`: add manual House points through the ledger
- `/houseadmin points remove`: remove manual House points through the ledger

## `~` Text Commands

LionDen also has public `~` text commands for red envelope claims and lion creature gameplay. See [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md) for the text-command surface, router entry points, handler files, and maintenance-mode behavior.

## Scheduler and Interaction Notes

See [OPERATIONS.md](OPERATIONS.md) for scheduler timing, maintenance mode, admin-only workflows, migrations, and health checks.
