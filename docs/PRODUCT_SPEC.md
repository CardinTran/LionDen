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

## Next Product Direction

The next product direction is Team Houses / House Cup: a team activity system that makes group participation visible without replacing individual progression. See [Next roadmap](ROADMAP_NEXT.md) for the current planning notes.

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
- the first successful member to type `~grab` in that channel receives the full configured coin amount
- each red envelope can only be claimed once

Current random red envelope rule:

- `/redenvelope configure` enables random drops for the guild and stores a fallback channel
- `/redenvelope pause` disables automated random drops without clearing the stored configuration
- `/redenvelope dropnow` lets an officer force one immediate configured drop
- `/redenvelope clearopen` lets an officer clear stale open envelopes if the server state gets stuck
- `/redenvelope status` lets an officer inspect the current red envelope automation and open-envelope state
- each guild stores a min/max coin amount and a min/max interval in minutes
- LionDen posts random drops using those ranges when no other open red envelope exists in the guild
- automatic drops target the most active eligible channel from the last 60 minutes of human message activity
- a channel must have at least 5 recent non-bot messages to qualify for active targeting
- if no channel meets that threshold, LionDen falls back to the configured channel
- current claim flow uses the first successful `~grab` message in the drop channel
- manual `/redenvelope create` also refuses to post if another open envelope already exists in the guild
- open red envelopes automatically expire after 15 minutes if they are not claimed

Current lion creature foundation rule:

- LionDen stores a seeded local lion species catalog backed by the current repo assets
- users can buy lion-related items with coins, but cannot buy lions directly
- current shop items include ball tiers and future spawn modifiers
- wild lions can spawn in active text channels using the active-channel targeting pattern
- members catch active wild lions publicly with `~catch <ball>`
- catch success uses species catch difficulty plus the selected ball modifier
- caught lions are stored as persistent user-owned creatures with level and XP fields reserved for future growth
- `~wild` shows active wild lions and channel locations

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

Current weekly challenge and badge foundation rule:

- `/weekly challenges` shows the caller's current weekly challenge progress
- `/weekly badges` shows the caller's earned LionDen badges
- default weekly challenges currently track practice attendance, wild lion catches, lion training, red envelope claims, and Training Hall battles
- challenge week keys use ISO-style UTC week labels such as `2026-W22`
- challenge completion can award small XP and coin rewards through the existing profile systems
- completing at least one weekly challenge awards the `Weekly Starter` badge
- progress hooks are best-effort; challenge tracking failures should log a warning without blocking the original practice, red envelope, or lion action

## Roadmap

1. Phase 0: repo foundation, toolchain, CI, `/ping`
2. Phase 1: profiles and XP
3. Phase 2: daily red envelopes and coins
4. Phase 3: practice check-in
5. Phase 4: random red envelope drops
6. Phase 5: badges and weekly challenges
7. Phase 6: shop and cosmetics
8. Phase 7: 24/7 deployment

Future roadmap work should prioritize Team Houses / House Cup as the next team activity layer after the current progression, challenge, lion, and duel foundations.
