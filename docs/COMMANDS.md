# Command Reference

## Slash Commands

### Public

- `/ping`: health check with round-trip latency
- `/profile`: show the caller's level, XP, coins, and progress
- `/leaderboard`: show top server members by XP
- `/daily`: claim the fixed daily coin reward

### Officer and Admin

- `/botadmin status`: show maintenance-mode state
- `/botadmin health`: check database and client health
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

## `~` Text Commands

### General

- `~grab`: claim an open red envelope in the current channel

### Lion Commands

- `~help`: show the public lion command guide
- `~shop`: show lion shop items
- `~buy <item> [quantity]`: buy lion items
- `~bag`: show the caller's lion item inventory
- `~use <item>`: activate a usable lion item in the current channel
- `~use training-snack <lion>`: give bonus XP to one owned lion
- `~catch <ball>`: attempt to catch the active wild lion in the current channel
- `~train <lion>`: train one owned lion
- `~nickname <lion> <name>`: set a lion nickname
- `~nickname <lion> clear`: clear a lion nickname
- `~release <lion> confirm`: release one owned lion for coins
- `~team`: show the caller's saved battle team
- `~team set <lion1> <lion2> <lion3>`: save up to three lions as the battle team
- `~team clear`: clear the saved battle team
- `~battle @user`: challenge another member's team
- `~battle training`: run a Training Hall battle against the NPC team
- `~battle accept [@user]`: accept a pending lion battle challenge
- `~battle decline [@user]`: decline a pending lion battle challenge
- `~accept [@user]`: alias for accepting a pending lion battle challenge
- `~decline [@user]`: alias for declining a pending lion battle challenge
- `~cancelbattle [@user]`: cancel a pending challenge you sent
- `~battlehistory [@user]`: show recent team battles
- `~battlestats [@user]`: show trainer win/loss stats
- `~battleboard`: show the top lion battle trainers
- `~toplions`: show the top owned lions
- `~lionboard`: alias for `~toplions`
- `~rarecatches`: show recent rare or high-level catches
- `~lions`: show the caller's caught lion roster
- `~lion <id, code, slug, or name>`: inspect one owned lion
- `~wild`: show active wild lions and their channel locations

## Scheduler and Interaction Notes

- Practice uses separate RSVP and attendance button posts.
- Practice scheduler posts RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time.
- Practice scheduler posts attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time.
- Red envelope automation targets the most active eligible channel from recent message activity, with configured fallback behavior.
- Lion spawns are driven by the lion spawn scheduler and channel-level spawn effects.
