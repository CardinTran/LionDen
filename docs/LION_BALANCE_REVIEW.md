# Lion Balance and Species Expansion Review

## Purpose

This review documents the lion system architecture before removing random wild
spawn level advantage. It also records the main considerations for expanding
the species catalog to a manifest-driven set of 2,000 or more lions.

## Current Rarity Model

`LionSpecies.rarity` is a persisted species property. The current values are:

- `COMMON`
- `UNCOMMON`
- `RARE`
- `EPIC`
- `LEGENDARY`

Rarity affects default spawn weights, seeded catch rates, and notable
spawn/catch messaging. Rarity does not directly change battle formulas. Rarer
prototype species are stronger indirectly because their seeded base stats are
higher.

## Current Spawn Weights

Each species stores a numeric `spawnWeight`. Weighted selection happens in
`chooseWeightedLionSpecies` in
`src/features/lions/lion-creature.service.ts`.

Prototype defaults:

- Common: `100`
- Uncommon: `55`
- Rare: `25`
- Epic: `10`
- Legendary: `3`

An active `RARITY_BOOST` channel effect multiplies weights for uncommon and
rarer species before selection. Officers can tune individual species weights
with `/lionadmin species tune`.

## Previous Wild Level Behavior

Before the fairness fix, naturally spawned lions received a random encounter
level:

- `75%` chance: level `1-10`
- `20%` chance: level `11-25`
- `5%` chance: level `26-50`

An active legacy `LEVEL_BOOST` channel effect could raise the generated level.
Officer-forced event drops could also provide a temporary minimum and maximum
encounter level.

## Previous Catch Chance

Catch chance was calculated as:

```text
levelPenalty = min(8, floor(max(0, spawnLevel - 1) / 10))
catchChance = clamp(baseCatchRate + ballCatchModifier - levelPenalty, 5, 95)
```

The species supplies `baseCatchRate`. The selected ball supplies
`ballCatchModifier`. Encounter level only adds a small catch penalty.

## Level Effects

Owned lion battle stats are derived from species base stats plus owned level:

```text
levelBonus = level - 1
hp = baseHp + levelBonus * 4
attack = baseAttack + floor(levelBonus * 1.5)
defense = baseDefense + floor(levelBonus * 1.3)
speed = baseSpeed + floor(levelBonus * 1.1)
```

Battle damage also uses attacker level directly. Level additionally affects
release value, top-lion leaderboard score, and Training Hall NPC scaling.

## Fairness Finding

The previous catch flow copied `ActiveLionSpawn.level` directly into
`UserLion.level`, while leaving new owned-lion experience at the database
default of `0`.

That caused two problems:

- A lucky catch could immediately create a much stronger battle lion without
  earned progression.
- The first XP award could recalculate the lion back down toward level `1`
  because XP and stored level disagreed.

Owned-lion XP should be the progression source of truth. Random encounter level
must not grant lasting owned-lion power.

## Corrected Direction

The fairness fix uses these rules:

- Naturally spawned wild lions are level `1`.
- Caught lions are always created with `level: 1` and `experience: 0`.
- Training and battle XP drive future owned-lion levels.
- Legacy `LEVEL_BOOST` shop definitions are disabled during default lion-data
  sync.
- Active legacy `LEVEL_BOOST` channel effects no longer change new spawns.
- Officer-forced event drops may still request a temporary encounter level,
  but that level does not transfer into the caught lion.

This keeps the existing schema compatible while removing random owned-power
advantage.

## Files Involved

Primary behavior:

- `src/features/lions/lion-seed-data.ts`
- `src/features/lions/lion-creature.service.ts`
- `src/features/lions/lion-progression.service.ts`
- `src/features/lions/lion-spawn-scheduler.ts`
- `src/bot/messages/lions/catch.handler.ts`
- `src/bot/messages/lions/use-item.handler.ts`
- `src/bot/commands/lionadmin.ts`

Display and docs:

- `src/features/lions/lion-formatting.ts`
- `docs/LION_TEXT_COMMANDS.md`
- `docs/MATH_LOGIC.md`
- `docs/OPERATIONS.md`
- `docs/DATA_MODEL.md`

## Test Coverage To Preserve

The focused regression surface lives in:

- `tests/lion-creature.service.test.ts`
- `tests/lion-creatures.message.test.ts`
- `tests/lion-non-battle-handlers.test.ts`
- `tests/lion-progression.service.test.ts`
- `tests/lion-battle.service.test.ts`
- `tests/lionadmin.command.test.ts`

Important invariants:

- Natural spawns are level `1`.
- Legacy `LEVEL_BOOST` effects do not raise spawn level.
- Catches create owned lions at level `1` with `0 XP`.
- Officer-forced encounter levels do not transfer into owned progression.
- XP awards continue to derive future owned levels.

## Manifest-Driven Species Expansion

The current prototype species array is suitable for a small photo set but
should move to a structured manifest before expanding to 2,000 or more species.
The manifest should remain the source of truth for:

- `publicId`
- `slug`
- `name`
- `imagePath`
- `rarity`
- `baseCatchRate`
- `baseValue`
- `spawnWeight`
- primary and secondary types
- base battle stats
- ability metadata
- description

`syncDefaultLionData` should update every manifest-owned field that is expected
to propagate to existing rows. In particular, future manifest work should
review how operator-tuned `spawnWeight` and `baseCatchRate` values interact with
manifest refreshes.

Exact species lookup should also move toward indexed database queries before
the catalog grows substantially. Loading all enabled species into memory is
acceptable for the current prototype pool but is not the ideal long-term
lookup path.

## R2 Image Hosting Interaction

R2 image hosting is orthogonal to lion balance. Keep `LionSpecies.imagePath` as
the canonical object key, such as:

```text
assets/lions/cards/rdl-lion-001.jpg
```

The manifest should provide that same key. Runtime URL generation can continue
to join the key with `R2_PUBLIC_BASE_URL`. Full public URLs should not be stored
per species.

## Risks and Follow-Ups

- Existing owned lions created before the fairness fix may still have levels
  that do not match their XP. Decide whether to leave historical data alone,
  backfill XP to match stored levels, or normalize stored levels from XP.
- Legacy `LEVEL_BOOST` inventory rows can remain stored after deprecation. They
  should not be purchasable or activatable.
- High-level notable-catch history can still include historical or
  officer-forced encounter records. That is encounter history, not owned power.
- A future manifest import should use an explicit operational workflow rather
  than making scheduler startup responsible for a large catalog refresh.

