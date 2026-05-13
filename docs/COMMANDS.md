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

## Planned MVP Commands

- `/daily`
- `/practice start`
- `/checkin`
- `/practice end`
