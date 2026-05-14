# Product Spec

## Product Goal

LionDen should increase meaningful team activity without encouraging spam. The bot should reward practice attendance, recurring participation, and helpful community behavior.

## MVP Scope

- `/ping`
- `/profile`
- `/leaderboard`
- `/daily`
- `/practice start`
- `/checkin`
- `/practice end`
- basic admin XP controls

## Product Rules

- Reward real participation more than spam.
- Keep commands simple.
- Avoid bloated economy systems early.
- Give officers simple correction tools.
- Keep the MVP narrow and validate interest before expanding.

## Current Progression Rules

The MVP progression display uses total XP thresholds that make early levels visible without letting one activity jump multiple levels.

Current thresholds:

- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 225 XP
- Level 4: 375 XP
- Level 5: 550 XP
- Level 6: 750 XP
- Level 7: 975 XP
- Level 8: 1225 XP
- Level 9: 1500 XP
- Level 10: 1800 XP

XP earning sources are intentionally still narrow. The bot can now display progression, but automatic XP awards should continue to prioritize real lion dance participation over passive or spam-friendly behavior.

Current message XP rule:

- award 5 XP for an eligible guild text message
- enforce one award per user per guild every 10 minutes
- ignore bot messages
- do not award passive VC XP in the MVP

Current leaderboard rule:

- `/leaderboard` shows the top 10 profiles in the current guild
- rankings sort by total XP descending
- ties break by earlier updates, then earlier profile creation, for stable output

Current admin XP control rule:

- `/xp add` and `/xp remove` are restricted to members with Manage Server permissions
- XP removals clamp at 0 rather than going negative
- admin adjustments immediately recalculate the member's derived level

Current economy foundation rule:

- each user profile now stores a coin balance
- coin balances clamp at 0 rather than going negative
- the coin balance foundation is in place for `/daily` and future red envelope features

Current daily reward rule:

- `/daily` awards 25 coins
- each member can claim once per calendar day in America/Chicago
- `/daily` does not grant XP
- streaks and random rewards are intentionally out of scope for the MVP

Current admin coin control rule:

- `/coins add` and `/coins remove` are restricted to members with Manage Server permissions
- coin removals clamp at 0 rather than going negative
- admin adjustments update the stored balance immediately

Current red envelope foundation rule:

- `/redenvelope create` creates a manual red envelope in the current channel
- the first successful claimant receives the full configured coin amount
- each red envelope can only be claimed once
- random timed drops are intentionally a later follow-up

Current practice attendance rule:

- only one active practice session may exist per guild
- manual practice can still be started with `/practice start`
- scheduled practice posts use one RSVP post earlier in the day and one attendance post at practice time
- RSVP is informational only
- `I'm Here` and `Not Here` are the authoritative attendance states
- current fixed weekly schedule is:
  - RSVP on Sunday, Tuesday, and Thursday at 5:00 PM Central Time
  - Attendance on Monday, Wednesday, and Friday at 5:00 PM Central Time
- `/practice end` closes the active session, stops further check-ins, and awards 30 XP to each member whose final attendance state is `HERE`
- `NOT_HERE`, or no attendance response, does not earn practice XP
- each practice participant can only be rewarded once per session

## Roadmap

1. Phase 0: repo foundation, toolchain, CI, `/ping`
2. Phase 1: profiles and XP
3. Phase 2: daily red envelopes and coins
4. Phase 3: practice check-in
5. Phase 4: random red envelope drops
6. Phase 5: badges and weekly challenges
7. Phase 6: shop and cosmetics
8. Phase 7: 24/7 deployment
