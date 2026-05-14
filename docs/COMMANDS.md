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

Officer/admin command that posts a manual LionDen red envelope in the current channel. The first successful claimant receives the configured coin amount.

### `/redenvelope configure`

Officer/admin command that enables random red envelope drops in the current channel and stores the amount plus interval ranges LionDen should use.

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
- `/redenvelope configure` enables random drops with stored amount and interval ranges

## Planned MVP Commands

- `/daily`
- `/checkin`
