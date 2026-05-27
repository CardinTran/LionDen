# Command Reference

## Slash Commands

### Public

- `/ping`: health check with round-trip latency
- `/profile`: show the caller's level, XP, coins, and progress
- `/leaderboard`: show top server members by XP
- `/daily`: claim the fixed daily coin reward
- `/weekly challenges`: show the caller's current weekly challenge progress
- `/weekly badges`: show the caller's earned LionDen badges
- `/practice history [member] [limit]`: show recent completed practice attendance history; replies are ephemeral
- `/practice leaderboard [period] [limit]`: show top practice attendees for the current month, last 30 days, or all time; replies are ephemeral
- `/practice streaks [member]`: show current and longest completed-practice attendance streaks; replies are ephemeral
- `/practice badges [member]`: show earned practice badges; replies are ephemeral
- `/house join`: join an active Team House
- `/house leave`: leave the caller's current Team House
- `/house profile`: show the caller's House profile, including weekly and lifetime House points
- `/house badges`: show the caller's earned House badges, or another member's badges when a member is provided
- `/house leaderboard`: show current House Cup standings
- `/house roster`: show members currently assigned to a House

### Officer and Admin

- `/botadmin status`: show maintenance-mode state
- `/botadmin health`: show an ephemeral development checklist for Discord readiness, database access, maintenance mode, practice, practice recap post tracking, practice badge definitions, red envelopes, lion spawns, Houses, and House badge definitions
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
- `/practice end`: end the active practice session, award attendance XP, and automatically post a practice recap when possible
- `/practice badge-sync`: sync default practice badge definitions and backfill badges from completed attendance history
- `/practice recap [session_id]`: post a read-only recap for the latest completed practice, or a specific completed practice session ID
- `/houseadmin create`: create a Team House
- `/houseadmin assign`: assign or move a member to a House
- `/houseadmin remove`: remove a member from their House
- `/houseadmin rename`: update House display details
- `/houseadmin deactivate`: deactivate a House so it cannot receive new public joins
- `/houseadmin points add`: add manual House points through the ledger
- `/houseadmin points remove`: remove manual House points through the ledger
- `/houseadmin recap configure`: enable Weekly House Recaps in a channel
- `/houseadmin recap postnow`: post the current Weekly House Recap, skipping duplicates unless forced
- `/houseadmin recap status`: inspect recap config, schedule, current week, and posted state
- `/houseadmin recap disable`: disable automatic Weekly House Recaps without deleting config or history
- `/houseadmin badge sync`: sync default House badge definitions
- `/houseadmin badge grant`: manually grant a House badge to a member

## `~` Text Commands

LionDen also has public `~` text commands for red envelope claims and lion creature gameplay. See [LION_TEXT_COMMANDS.md](LION_TEXT_COMMANDS.md) for the text-command surface, router entry points, handler files, and maintenance-mode behavior.

## Scheduler and Interaction Notes

See [OPERATIONS.md](OPERATIONS.md) for scheduler timing, maintenance mode, admin-only workflows, migrations, and health checks.

## Practice Attendance Visibility

- Practice history and streak commands default to the caller.
- When a member is provided, the response still stays ephemeral to the requester.
- Only completed practice sessions count for attendance history, streaks, and leaderboards.
- `I'm Here` / `HERE` counts as attended.
- `Not Here` / `NOT_HERE` and no attendance response do not count as attended.
- Future, scheduled, or still-active practice sessions are excluded.
- `/practice end` automatically posts a public recap after a successful end. It uses the practice announcement channel, configured practice channel, or command channel as a fallback.
- Automatic recap posts are tracked once per guild and practice session so retrying `/practice end` does not create another automatic recap.
- `/practice recap` is officer-only, posts publicly on success, and summarizes attendance, recorded XP, existing practice House points, and top active streak highlights without awarding new rewards. It can still be run manually even if an automatic recap already posted.
- Practice badges are cosmetic LionDen badges. They do not grant XP, coins, House points, combat bonuses, lion stats, or economy advantages.
- Practice badge criteria: First Practice (1 attended practice), Three Practice Streak (3 in a row), Five Practice Streak (5 in a row), Perfect Week (attended every completed practice in a week with at least 1 completed practice), Practice Regular (10 attended practices), and Practice Veteran (25 attended practices).
- `/practice badge-sync` is officer-only, idempotent, and useful when a server already has completed attendance history before practice badges were enabled.
