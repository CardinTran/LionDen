# Command Reference

## Implemented

### `/ping`

Health check command that returns bot latency information.

### `/profile`

Returns the caller's current LionDen profile, creating it automatically on first use.
Shows:

- current level
- total XP
- coin balance
- progress toward the next level
- remaining XP needed to level up

Current progression note:

- eligible guild text messages award 5 XP at most once every 10 minutes

### `/leaderboard`

Shows the top 10 server members ranked by total XP, with each member's current level beside their XP total.

### `/daily`

Claims a fixed daily coin reward once per calendar day using LionDen's Central Time reset.

### `/redenvelope create`

Officer/admin command that posts a manual LionDen red envelope in the current channel. Members claim it publicly by typing `~grab` in that same channel, and the first successful claimant receives the configured coin amount.

### `/redenvelope configure`

Officer/admin command that enables random red envelope drops for the server, stores the amount plus interval ranges LionDen should use, and uses the current channel as the fallback channel if no active channel qualifies.

### `/redenvelope pause`

Officer/admin command that pauses automated random red envelope drops without deleting the stored configuration.

### `/redenvelope dropnow`

Officer/admin command that forces one immediate configured random red envelope drop using the stored amount range and active-channel targeting rules.

### `/redenvelope clearopen`

Officer/admin command that clears stale open red envelopes when the server state got stuck and no visible envelope remains to claim.

### `/redenvelope status`

Officer/admin command that shows the current red envelope automation state, fallback channel, ranges, next scheduled drop, and whether an open envelope is currently active.

### `/lionadmin configure`

Officer/admin command that configures automated wild lion spawn timing. This command is hidden from normal members by Discord's Manage Server permission gate.

### `/lionadmin dropnow`

Officer/admin command that forces one wild lion spawn in the current text channel for testing, events, or moderation-controlled gameplay moments. Officers can optionally force a species, rarity, or event level range.

### `/lionadmin clearspawn`

Officer/admin command that expires active wild lion spawns in the current channel if server state gets stuck.

### `/lionadmin cleareffects`

Officer/admin command that clears active lion item effects in the current channel.

### `/lionadmin grantitem`

Officer/admin command that grants a lion item to a member for events, support, or recovery.

### `/lionadmin species enable/tune`

Officer/admin controls for enabling or disabling a species and tuning its spawn weight or base catch rate.

### `/lionadmin item enable/tune`

Officer/admin controls for enabling or disabling a shop item and tuning its price or effect value.

### `/lionadmin pause`

Officer/admin command that pauses automated wild lion spawns without deleting the stored timing configuration.

### `/lionadmin resume`

Officer/admin command that resumes automated wild lion spawns.

### `/lionadmin status`

Officer/admin command that shows lion spawn automation state, interval ranges, next scheduled spawn, last spawn, and active wild lion locations.

### `/botadmin status`

Officer/admin command that shows whether LionDen maintenance mode is enabled. This command is hidden from normal members by Discord's Manage Server permission gate.

### `/botadmin health`

Officer/admin command that runs a lightweight health check for database reachability, maintenance state, and Discord client readiness.

### `/botadmin reloadpresence`

Officer/admin command that reapplies the bot's rich presence from the current maintenance state.

### `/botadmin maintenance`

Officer/admin command that enables or disables maintenance mode and optionally sets the public maintenance message. When maintenance mode is enabled, non-officers cannot use public bot interactions, automated public scheduler posts are skipped, and the bot presence changes to maintenance mode.

### `/coins add`

Officer/admin command that adds coins to a member and returns their updated coin balance.

### `/coins remove`

Officer/admin command that removes coins from a member, clamps the total at zero, and returns their updated coin balance.

### `/xp add`

Officer/admin command that adds XP to a member and returns their updated total XP and level.

### `/xp remove`

Officer/admin command that removes XP from a member, clamps the total at zero, and returns their updated total XP and level.

### `/practice start`

Officer/admin command that starts one active manual practice session for the server and posts separate RSVP and attendance messages in the current channel.

### `/practice configure`

Officer/admin command that sets the current channel as the scheduled practice channel for LionDen's automatic weekly practice posts.

### `/practice end`

Officer/admin command that closes the active practice session, disables the attendance button, and awards practice XP to members whose final attendance state is `I'm Here`.

### Practice Scheduler

Once configured, LionDen automatically posts:

- RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time
- Attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time

### Practice Buttons

When practice is live, members use two separate practice posts:

- RSVP buttons: `Going`, `Late`, `Leaving Early`, `Not Going`
- Attendance buttons: `I'm Here`, `Not Here`

RSVP is for planning. Attendance is the authoritative record for rewards.

### Practice Reward Rule

- `/practice end` awards 30 XP to each member marked `I'm Here`
- members marked `Not Here`, or members with no attendance response, do not earn practice XP
- each session can only reward a participant once

### Economy Foundation

- coin balances now exist on user profiles
- `/daily` now awards 25 coins once per calendar day
- `/daily` does not award XP
- no streaks or randomness are included yet
- `/coins add` and `/coins remove` give officers simple balance correction tools
- `/redenvelope create` posts a first-come, first-claimed coin envelope in the current channel
- members now claim envelopes publicly with `~grab`
- `/redenvelope configure` enables random drops with stored amount and interval ranges
- automatic drops target the most active eligible channel from the last 60 minutes of human message activity
- a channel needs at least 5 recent non-bot messages to qualify for active targeting
- if no channel qualifies, LionDen falls back to the configured channel
- `/redenvelope pause` stops automated drops until an officer configures them again
- `/redenvelope dropnow` gives officers a manual override without removing the competitive `~grab` race
- `/redenvelope clearopen` gives officers a recovery path if stale open envelopes block new drops
- open red envelopes automatically expire after 15 minutes if nobody claims them
- `/redenvelope status` gives officers a quick view of whether the red envelope system is healthy

### Lion Creature Commands

LionDen now has a first public lion-creature loop inspired by Poketwo-style wild encounters.

- `~shop` shows lion items that can be bought with coins.
- `~buy <item> [quantity]` buys lion items such as balls and future spawn modifiers.
- `~bag` shows the caller's lion item inventory.
- `~help` shows the public lion command guide for new users.
- `~use <item>` activates a usable lure or spawn modifier in the current channel.
- `~use training-snack <lion>` gives one owned lion bonus XP from inventory.
- `~catch <ball>` attempts to catch the active wild lion in the current channel.
- `~train <lion>` trains one owned lion for XP, using that lion's training cooldown.
- `~nickname <lion> <name>` sets a compact nickname for one owned lion.
- `~nickname <lion> clear` clears that lion's nickname.
- `~team` shows the caller's saved battle team.
- `~team set <lion1> <lion2> <lion3>` saves up to 3 owned lions as the caller's battle team.
- `~team clear` clears the caller's battle team.
- `~battle @user` challenges another member's saved team.
- `~battle accept [@user]` accepts a pending lion battle challenge and resolves the battle.
- `~battle decline [@user]` declines a pending lion battle challenge.
- `~accept [@user]` accepts a pending lion battle challenge and resolves the battle.
- `~decline [@user]` declines a pending lion battle challenge.
- `~cancelbattle [@user]` cancels a pending challenge you sent.
- `~battle training` runs a quick Training Hall PvE battle against a scaled bot team.
- `~battlehistory [@user]` shows recent recorded team battles.
- `~battlestats [@user]` shows win/loss stats for a trainer.
- `~battleboard` shows the top lion battle trainers in the server.
- `~toplions` or `~lionboard` shows the top 10 strongest owned lions in the server.
- `~rarecatches` shows recent rare or high-level catches in the server.
- `~lions` shows the caller's caught lion roster.
- `~lion <id, code, slug, or name>` inspects one caught lion owned by the caller.
- `~wild` shows active wild lions and their channel locations.

Current lion creature rules:

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
- rare lures boost rare/epic/legendary spawn weights in the channel
- level lures raise wild encounter levels in the channel
- battle teams are persistent per guild/user and can contain 1 to 3 owned lions
- team battles send out team slot 1 first, then the next slot when a lion faints
- public PvP battles use a short persisted challenge acceptance flow before resolving
- current battles are automatic; players do not choose turns or moves yet
- battle results show round logs, move names, damage, type matchup notes, XP results, and a short winner summary
- interactive 1v1 turn-based duels are planned later
- quick battles use speed, move power, type matchups, derived stats, battle records, and battle XP cooldowns
- team battle starts are cooldown-limited per recent participant pair to reduce spam
- only lions that participate in a team battle receive battle XP
- Training Hall battles use the same battle engine against a generated NPC team
- battle stats and battle boards are guild-scoped and derived from recorded battle history
- species have readable public codes such as `L001`, plus internal database IDs for persistence
- owned lion inspection now shows nickname, acquisition source, type, ability, level, XP, and derived battle stats

## Planned MVP Commands

- `/daily`
- `/checkin`
