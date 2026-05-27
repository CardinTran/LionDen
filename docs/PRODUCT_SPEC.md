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

Current practice attendance history rule:

- `/practice history` shows recent completed practice attendance for the caller, or for a selected member when provided
- `/practice streaks` shows current streak, longest streak, total attended practices, current-month attendance, and last attended date
- `/practice leaderboard` ranks members by attended completed practices for the current month by default, with last-30-days and all-time options
- these views are based on completed practice sessions and existing check-in records; they do not change practice rewards or check-in behavior
- `HERE` is the only status that counts as attended
- `NOT_HERE` and no response are neutral non-attendance states and do not count toward streaks or leaderboards
- future, scheduled, or active practice sessions are excluded
- personal history and streak views reply ephemerally so attendance visibility is useful without public shaming

Current practice recap rule:

- `/practice recap` is an officer command that posts a public recap for the latest completed practice by default
- officers can provide a practice session ID to recap a specific completed session
- recaps include attended, `Not Here`, and `No Response` counts using neutral language
- recaps summarize persisted attendance XP records but do not award XP
- recaps summarize existing `PRACTICE_ATTENDANCE` House point ledger entries but do not add House points
- recaps show up to three active streak highlights among attendees when those streaks are at least two practices long
- active, scheduled, future, or missing practice sessions do not produce recaps
- automatic recap posting after `/practice end` is deferred until duplicate-post tracking is designed

Current weekly challenge and badge foundation rule:

- `/weekly challenges` shows the caller's current weekly challenge progress
- `/weekly badges` shows the caller's earned LionDen badges
- default weekly challenges currently track practice attendance, wild lion catches, lion training, red envelope claims, and Training Hall battles
- challenge week keys use ISO-style UTC week labels such as `2026-W22`
- challenge completion can award small XP and coin rewards through the existing profile systems
- completing at least one weekly challenge awards the `Weekly Starter` badge
- progress hooks are best-effort; challenge tracking failures should log a warning without blocking the original practice, red envelope, or lion action

Current Team Houses / House Cup foundation rule:

- members can belong to one active House per guild
- public `/house` commands let members join, leave, view profiles, view rosters, and view House Cup standings
- officer-only `/houseadmin` commands create Houses, assign or remove members, rename or deactivate Houses, and add or remove manual House points
- House points are ledger-based; totals are calculated by summing point entries rather than mutating a stored total
- practice attendance awards 10 House points after `/practice end` successfully applies the attendance XP reward
- weekly challenge completion awards 5 House points when a challenge is newly completed
- red envelope claims award 1 House point after a successful `~grab`
- wild lion catches award 1 House point after a successful `~catch`
- lion training awards 1 House point after a successful `~train`
- Training Hall battles award 2 House points after a completed `~battle training`
- interactive duel completions award 2 House points to each participant after a completed `~duel`
- House point hooks are best-effort; failures log warnings without blocking the original activity flow
- members without Houses do not receive House points and do not break existing flows
- message activity does not award House points yet; it needs a capped anti-spam design before implementation

Current Weekly House Recap rule:

- officers configure recaps with `/houseadmin recap configure`
- recaps summarize the existing House point ledger; they do not mutate House totals or add new point sources
- recaps include weekly standings, top contributors, category highlights, and point source breakdowns
- category highlights cover practice, weekly challenges, red envelopes, lion activity, battle/duel activity, and admin adjustments
- `/houseadmin recap postnow` lets officers manually post the current recap
- automatic recap posting is controlled by the configured channel, weekday, hour, minute, and timezone
- normal weekly recap posts are de-duplicated by guild and week key
- empty states are valid: no Houses, no points, or no contributors should produce readable recap text

Current House achievement rule:

- House badges are durable, social proof of House participation and weekly recap accomplishments
- House badges are cosmetic only and do not affect combat, XP, coins, economy rewards, or House point totals
- default House badge definitions are synced through `/houseadmin badge sync` or automatically before recap/manual award flows
- `/house badges` shows earned House badges, and `/house profile` includes a compact recent badge summary
- official weekly recap posts award weekly House badges once per guild/user/badge/week
- forced recap reposts and duplicate skipped recaps do not create duplicate badge awards
- current default badges are House Founder, House Champion, Weekly Contributor, Practice Powerhouse, Red Envelope Raider, Lion Handler, and Duel Defender
- House Founder is definition/manual-award only in this foundation PR
- House titles are intentionally deferred until title selection and display rules can stay clean

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
