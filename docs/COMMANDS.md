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

Officer/admin command that starts one active practice session for the server and posts the official LionDen attendance message in the current channel.

### `/practice end`

Officer/admin command that closes the active practice session and disables the attendance button.

### Practice Attendance Button

When practice is live, members click the bot-posted `I'm Here` button. That button response is the official attendance record for the session.

## Planned MVP Commands

- `/daily`
- `/checkin`
