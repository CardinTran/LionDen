# LionDen Math Logic

This document records the numerical and formula-based logic currently used in LionDen.

It is meant as the single reference for:

- XP and level progression
- daily rewards
- coin adjustments
- red envelope drops and expiry
- message XP cooldowns
- practice rewards
- lion creature spawning and catching
- item inventory and shop math
- any other current bot logic that depends on numeric rules

## 1. Leveling

### Total XP Needed For A Level

LionDen uses a quadratic XP curve.

The total XP required for a level is:

```text
totalXp(level) = ((level - 1) * (25 * level + 150)) / 2
```

Where:

- `level` is an integer `>= 1`
- `level 1` requires `0 XP`

### Current Thresholds

The current visible thresholds are:

- Level 1: `0 XP`
- Level 2: `100 XP`
- Level 3: `225 XP`
- Level 4: `375 XP`
- Level 5: `550 XP`
- Level 6: `750 XP`
- Level 7: `975 XP`
- Level 8: `1225 XP`
- Level 9: `1500 XP`
- Level 10: `1800 XP`

### Growth Pattern

Each level requires more XP than the previous one.

The increases between levels are:

- `+100`
- `+125`
- `+150`
- `+175`
- `+200`
- `+225`
- `+250`
- `+275`
- `+300`

So the curve grows by `25 XP` more per level step than the previous increase.

### Level From XP

Given total XP, the current level is the highest level whose threshold is less than or equal to the XP total.

In code terms:

```text
level = 1
while totalXp(level + 1) <= xp:
  level += 1
```

### Level Progress

For a given total XP:

```text
currentLevel = level(xp)
currentLevelXpFloor = totalXp(currentLevel)
nextLevel = currentLevel + 1
nextLevelXpTarget = totalXp(nextLevel)
xpIntoLevel = xp - currentLevelXpFloor
xpNeededForNextLevel = nextLevelXpTarget - xp
xpSpanThisLevel = nextLevelXpTarget - currentLevelXpFloor
```

## 2. Message XP

Message XP is intentionally small and rate-limited.

### Message XP Amount

- `MESSAGE_XP_AMOUNT = 5`

### Message XP Cooldown

- `MESSAGE_XP_COOLDOWN_MS = 10 minutes = 600,000 ms`

### Award Rule

A guild text message can award `5 XP` only if the user is outside the 10-minute cooldown window.

Eligibility logic:

```text
eligible = true if:
  no previous message XP exists
  or now >= lastAwardedAt + 10 minutes
```

### Cooldown End

```text
cooldownEndsAt = lastAwardedAt + 10 minutes
```

## 3. Daily Reward

### Daily Coin Reward

- `DAILY_COIN_REWARD = 25 coins`

### Claim Rule

A user can claim once per calendar day in `America/Chicago`.

### Eligibility Rule

```text
eligible = true if:
  no previous daily claim exists
  or the previous claim is not on the same calendar day in America/Chicago
```

### Next Claim Time

The next claim time is the next calendar day reset in `America/Chicago`.

This is computed from the timezone-aware day boundary, not by adding a fixed 24 hours to the UTC timestamp.

## 4. Coins

Coins are stored on the user profile and always clamp at zero for removals.

### Coin Adjustment

```text
nextCoins = max(0, currentCoins + delta)
```

Where:

- `delta > 0` adds coins
- `delta < 0` removes coins

### Daily Coin Update

```text
nextCoins = currentCoins + 25
```

### Red Envelope Coin Update

When a red envelope is claimed:

```text
nextCoins = currentCoins + envelope.amount
```

## 5. Red Envelopes

Red envelopes are the current public coin-drop mini-game.

### Amount Range

The random amount is chosen uniformly from:

```text
minAmount ... maxAmount
```

### Interval Range

The next random drop is scheduled uniformly from:

```text
minIntervalMinutes ... maxIntervalMinutes
```

### Random Drop Formula

```text
amount = random integer in [minAmount, maxAmount]
nextDropAt = now + random integer in [minIntervalMinutes, maxIntervalMinutes] minutes
```

### Expiry Window

- `RED_ENVELOPE_EXPIRY_MINUTES = 15`

An open red envelope expires after 15 minutes.

```text
expired = now - createdAt >= 15 minutes
```

### Claim Rule

The first successful `~grab` claim wins.

If the envelope has already been claimed, later attempts fail.

### Active Channel Targeting

Random red envelope drops prefer the most active eligible text channel in the last 60 minutes.

The activity rule is:

- count only non-bot messages
- look back over a 60-minute window
- require at least 5 recent messages for a channel to qualify

If no channel qualifies, the configured fallback channel is used.

## 6. Practice Rewards

Practice is a fixed XP reward system for attendance.

### Attendance XP

- `PRACTICE_ATTENDANCE_XP = 30 XP`

### Reward Rule

At practice end:

```text
if attendanceStatus == HERE and rewardAppliedAt is null:
  award 30 XP
  mark rewardAppliedAt = endedAt
```

### Double Reward Protection

A participant can only be rewarded once per session.

## 7. Lion Creature System

The lion creature system is the new public monster-collection layer.

### Spawn Duration

- `LION_SPAWN_DURATION_MS = 10 minutes = 600,000 ms`

### Spawn Interval

Spawn scheduling uses a random interval from:

- minimum: `120 minutes`
- maximum: `240 minutes`

### Spawn Scheduling Formula

```text
nextSpawnAt = now + random integer in [120, 240] minutes
```

### Spawn Weight Selection

Each lion species has a `spawnWeight`.

Selection is weighted randomly:

```text
totalWeight = sum(max(0, spawnWeight) for enabled species)
roll = random() * totalWeight

for each species:
  roll -= max(0, spawnWeight)
  if roll <= 0:
    choose that species
```

This means:

- higher `spawnWeight` increases the chance of being selected
- negative weights are treated as `0`
- species must be enabled to participate

### Wild Spawn Level Selection

Naturally generated wild spawns are level `1`.

```text
naturalSpawnLevel = 1
```

Officer-forced event drops can provide a temporary min/max encounter level
range for that one spawn. Encounter level remains stored on the active spawn
for display and catch difficulty, but it does not transfer into owned
progression.

```text
caughtLionLevel = 1
caughtLionXp = 0
```

Owned lion levels are earned through training and battle XP.

### Species Catch Chance

Catch chance is based on:

```text
levelPenalty = min(8, floor(max(0, spawnLevel - 1) / 10))
catchChance = clamp(baseCatchRate + ballCatchModifier - levelPenalty, 5, 95)
```

Where:

- `baseCatchRate` comes from the species
- `ballCatchModifier` comes from the item used
- `levelPenalty` is normally `0` for natural spawns and remains available for officer-forced event encounters
- the final chance is bounded between `5%` and `95%`

### Catch Success Roll

The catch attempt succeeds if:

```text
random() < catchChance / 100
```

Otherwise the catch misses.

### Wild Spawn Rule

Only one active wild lion may exist in a channel at a time.

If a channel already has an active spawn, a new one is not created there yet.

Activity lures do not make the global scheduler fire immediately. They mark the
channel as preferred when the next automated spawn is due. This keeps spawns
conservative for the current small lion pool while giving users a meaningful way
to spend coins together.

Rare lures multiply species spawn weights by rarity:

```text
LEGENDARY: weight *= 1 + effectValue / 10
EPIC:      weight *= 1 + effectValue / 20
RARE:      weight *= 1 + effectValue / 30
UNCOMMON:  weight *= 1 + effectValue / 60
COMMON:    unchanged
```

### Catch Consumption

The current implementation consumes the selected ball item on attempt.

That means the inventory is reduced before the final success result is known.

### Catch Outcomes

Current catch outcomes:

- `caught`
- `missed`
- `no_spawn`
- `spawn_expired`
- `item_not_found`
- `not_a_ball`
- `no_item`
- `already_caught`

## 8.5. Lion Item Effects

Current fully implemented utility effects:

- `CATCH_MODIFIER`: used by ball items during `~catch`
- `SPAWN_BOOST`: makes a channel preferred for the next automated spawn while active
- `RARITY_BOOST`: raises rare spawn weights in that channel while active
- `TRAINING_XP`: consumes the item and awards XP to one owned lion

`LEVEL_BOOST` is a deprecated legacy effect. Default lion-data sync disables
legacy shop definitions, and active legacy channel effects do not change new
wild spawn levels.

Channel effects expire by timestamp and are cleaned before reads. The same
effect type cannot be activated twice in the same channel at the same time, so a
user cannot accidentally waste a second lure while the first one is still active.

## 8. Lion Shop Math

The lion shop sells items, not lions.

### Item Cost

```text
totalCost = priceCoins * quantity
```

### Purchase Rule

An item can be purchased only if:

```text
currentCoins >= totalCost
```

### Inventory Update

On purchase:

```text
nextQuantity = currentQuantity + quantity
```

## 9. Lion Species Seed Math

The current seed catalog uses a small rarity curve.

### Seed Pool

The initial seeded set mirrors the current 27 local images.

### Example Rarity Distribution

- 12 `COMMON`
- 8 `UNCOMMON`
- 4 `RARE`
- 2 `EPIC`
- 1 `LEGENDARY`

### Example Spawn Weight Distribution

- `COMMON`: `100`
- `UNCOMMON`: `55`
- `RARE`: `25`
- `EPIC`: `10`
- `LEGENDARY`: `3`

### Example Catch Rate Distribution

- `COMMON`: `70`
- `UNCOMMON`: `60`
- `RARE`: `45`
- `EPIC`: `30`
- `LEGENDARY`: `18`

These are current balancing defaults, not fixed forever.

## 10. Lion Progression Math

Lion ownership now has a separate creature progression curve from the main user profile XP curve.

### Total Lion XP Needed For A Level

```text
totalLionXp(level) = ((level - 1) * (40 * level + 60)) / 2
```

Where:

- `level` is clamped between `1` and `100`
- `level 1` requires `0 XP`
- `level 2` requires `70 XP`
- `level 3` requires `180 XP`
- `level 10` requires `2070 XP`

### Level From Lion XP

```text
level = 1
while totalLionXp(level + 1) <= lionXp:
  level += 1
```

### Derived Lion Stats

Species store base battle stats. Owned lions derive battle-ready stats from species base stats plus level.

```text
levelBonus = level - 1

hp = baseHp + levelBonus * 4
attack = baseAttack + floor(levelBonus * 1.5)
defense = baseDefense + floor(levelBonus * 1.3)
speed = baseSpeed + floor(levelBonus * 1.1)
```

All derived stats clamp to at least `1`.

### Training XP

Training is an intentional public action on an owned lion.

- `LION_TRAINING_XP = 35`
- `LION_TRAINING_COOLDOWN_MS = 30 minutes = 1,800,000 ms`

On a successful training action:

```text
nextLionXp = currentLionXp + 35
nextLionLevel = level(nextLionXp)
lastTrainedAt = now
```

The same owned lion cannot train again until:

```text
trainingAvailableAt = lastTrainedAt + 30 minutes
```

## 11. Lion Battle Foundation Math

The current battle implementation supports quick auto-resolved team battles.
Users save a persistent team of up to 3 owned lions, and `~battle @user` uses
both saved teams instead of requiring lion IDs every battle.

### Battle Teams

Teams are stored per guild/user.

```text
teamSize = 1 to 3 owned lions
teamOrder = slot 1, slot 2, slot 3
```

Validation rules:

- every team lion must belong to the same guild/user
- duplicate owned lions are not allowed in the same team
- team order matters for battle entry order
- stale team slots are ignored if ownership no longer matches

### Battle Moves

Each lion gets a small move set from its typing:

```text
moves = [primaryTypeMove]

if secondaryType exists:
  moves += [secondaryTypeMove]

if Pounce is not already included:
  moves += [Pounce]
```

The current default move is:

- `Pounce`
- type: `NEUTRAL`
- power: `40`
- accuracy: `100`

### Type Effectiveness

Each attack type has matchup multipliers against defender types.

```text
typeMultiplier = matchup(attackType, defenderPrimaryType)

if defenderSecondaryType exists and differs from defenderPrimaryType:
  typeMultiplier *= matchup(attackType, defenderSecondaryType)
```

Default matchup value is `1`.

Current notable strengths:

- `FIRE` is strong against `NATURE` and `METAL`
- `WATER` is strong against `FIRE` and `EARTH`
- `EARTH` is strong against `FIRE` and `METAL`
- `WIND` is strong against `EARTH`
- `NATURE` is strong against `WATER` and `EARTH`
- `LIGHT` and `SHADOW` are strong against each other
- `METAL` is strong against `WIND` and slightly strong against `LIGHT`

### Same-Type Attack Bonus

If a move type matches either of the attacker's types:

```text
sameTypeAttackBonus = 1.2
```

Otherwise:

```text
sameTypeAttackBonus = 1
```

### Damage Formula

```text
baseDamage = ((((2 * attackerLevel) / 5 + 2) * movePower * (attack / defense)) / 50) + 2
damage = floor(baseDamage * sameTypeAttackBonus * typeMultiplier * randomModifier)
damage = max(1, damage)
```

The optional random modifier is clamped between `0.85` and `1`.

### Turn Order

```text
faster lion acts first
if speeds tie:
  lower lexicographic owned-lion id acts first
```

This deterministic tie-breaker keeps tests stable until full battle state exists.

### Auto Battle Resolution

Team battles run up to `60` rounds.

Each side starts with team slot 1 active.

Each round:

```text
firstActiveLion = first living lion in first team order
secondActiveLion = first living lion in second team order
turnOrder = faster lion first
each active lion uses the next move in its move set
damage is subtracted from the defender's current HP
if an active lion reaches 0 HP, the next team slot enters
if one team has no remaining lions, battle ends
```

If both teams still have lions after the round limit, the winner is the team
with more total remaining HP. If HP is tied, the first team wins for now so the
result remains deterministic.

### Battle XP

Battle XP rewards are intentionally cooldown-limited per owned lion.

- `LION_BATTLE_WIN_XP = 45`
- `LION_BATTLE_LOSS_XP = 18`
- `LION_BATTLE_COOLDOWN_MS = 10 minutes = 600,000 ms`

Only lions that actively entered the battle receive battle XP.

On an eligible battle XP award:

```text
if lion participated and lion team won:
  battleXp = 45
else if lion participated:
  battleXp = 18

nextLionXp = currentLionXp + battleXp
nextLionLevel = level(nextLionXp)
lastBattledAt = now
```

If the same owned lion is still on battle XP cooldown, the battle can still resolve, but that lion does not receive battle XP again until:

```text
battleXpAvailableAt = lastBattledAt + 10 minutes
```

### Team Battle Start Cooldown

Team battles now also record a compact persistent battle summary. Before a new
team battle resolves, LionDen checks whether either participant has a recent
battle record in the current guild.

```text
LION_USER_BATTLE_COOLDOWN_MS = 5 minutes

if latestBattleForEitherUser.createdAt > now - 5 minutes:
  block the new battle start
```

This cooldown limits public battle spam while keeping the current auto-resolved
team battle flow simple.

### Battle Challenges

PvP battles use persisted challenge rows instead of in-memory state.

```text
challengeDuration = 2 minutes
~battle @user creates a PENDING challenge
~accept resolves the newest matching PENDING challenge
~decline marks it DECLINED
~cancelbattle marks it CANCELED
expired PENDING challenges are marked EXPIRED before challenge reads
```

This keeps challenge state safe across process restarts and avoids fragile
long-lived Discord sessions.

### Training Hall Battles

`~battle training` builds a temporary NPC team from enabled species.

```text
npcTeamSize = min(3, userTeamSize)
averageLevel = round(sum(userTeamLevels) / userTeamSize)
npcLevel = clamp(averageLevel + random integer [-2, 2], 1, 50)
```

Training Hall battle records use a reserved internal user id and are excluded
from public trainer stat boards.

### Battle MVP

The battle MVP is the participating lion with the highest total damage dealt.
Ties are broken by owned-lion ID for deterministic output.

## 12. Lion Board Ranking Math

The `~toplions` board ranks owned lions inside the current guild only.

Current score:

```text
score =
  level * 1000
  + floor(experience / 10)
  + hp
  + attack * 3
  + defense * 2
  + speed * 2
```

This makes level the primary signal while still letting strong species stats
matter. Public output shows owner display names, but ownership and validation
continue to use stable Discord user IDs internally.

## 12.5. Trainer Battle Boards

Trainer battle stats are derived from persisted `LionBattleRecord` rows inside
the current guild.

```text
wins = count(records where winnerUserId = userId)
losses = count(records where loserUserId = userId)
battles = wins + losses
winRate = wins / battles
```

The `~battleboard` ranking sorts by:

```text
wins desc
winRate desc
battles desc
displayName asc
```

## 13. Future Math Not Yet Finalized

These systems are planned but not yet fully designed:

- raid boss health and scaling formulas
- gambling-linked lion growth math
- move learning rules
- ability and passive battle effects
- full turn-menu battle interaction

When those systems are implemented, this document should be extended rather than replaced.

## 14. Quick Reference

- Message XP: `5 XP` every `10 minutes`
- Daily reward: `25 coins` once per calendar day in `America/Chicago`
- Practice reward: `30 XP` for each `HERE` participant at session end
- Red envelope expiry: `15 minutes`
- Red envelope random amount: between configured min and max
- Red envelope random interval: between configured min and max minutes
- Lion spawn duration: `10 minutes`
- Lion spawn interval: `120-240 minutes`
- Natural wild lion level: `1`
- Catch chance: `clamp(baseCatchRate + itemBonus - levelPenalty, 5, 95)`
- Lion level 2 threshold: `70 XP`
- Lion default move foundation: `Pounce`, neutral type, `40` power, `100` accuracy
- Lion training reward: `35 XP` every `30 minutes` per owned lion
- Lion battle reward: `45 XP` winner, `18 XP` loser, every `10 minutes` per owned lion

## 15. Notes

This document reflects the current codebase, not a theoretical future design.

If a formula changes in code, update this document at the same time so the math stays in sync with implementation.
