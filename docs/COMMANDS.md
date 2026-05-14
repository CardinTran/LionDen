# Command Reference

## Implemented

### `/ping`

Health check command that returns bot latency information.

### `/profile`

Returns the caller's current LionDen profile, creating it automatically on first use.
Shows:

- current level
- total XP
- progress toward the next level
- remaining XP needed to level up

Current progression note:

- eligible guild text messages award 5 XP at most once every 10 minutes

### `/leaderboard`

Shows the top 10 server members ranked by total XP, with each member's current level beside their XP total.

### `/xp add`

Officer/admin command that adds XP to a member and returns their updated total XP and level.

### `/xp remove`

Officer/admin command that removes XP from a member, clamps the total at zero, and returns their updated total XP and level.

### `/practice start`

Officer/admin command that starts one active manual practice session for the server and posts separate RSVP and attendance messages in the current channel.

### `/practice configure`

Officer/admin command that sets the current channel as the scheduled practice channel for LionDen's automatic weekly practice posts.

### `/practice end`

Officer/admin command that closes the active practice session and disables the attendance button.

### Practice Scheduler

Once configured, LionDen automatically posts:

- RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time
- Attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time

### Practice Buttons

When practice is live, members use two separate practice posts:

- RSVP buttons: `Going`, `Late`, `Leaving Early`, `Not Going`
- Attendance buttons: `I'm Here`, `Not Here`

RSVP is for planning. Attendance is the authoritative record for rewards.

## Planned MVP Commands

- `/daily`
- `/checkin`
