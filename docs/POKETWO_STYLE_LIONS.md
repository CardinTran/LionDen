# Lion Creature System Roadmap

## Purpose

This document replaces the earlier split between a Mudae-style card feature and a Poketwo-style creature feature.

The current direction is to build one primary lion game system for LionDen:

- lions can be obtained through controlled acquisition methods
- lions become persistent creatures owned by users
- lions can later be leveled, trained, and battled
- the long-term endgame includes PvP and cooperative raid-style bosses

This system should feel closer to Poketwo and Pokemon-style creature ownership than to Mudae's large-scale roll-and-collect catalog.

## Why This Direction Makes Sense

The current lion asset pool is small.

That changes the product strategy in an important way:

- a Mudae-style system depends heavily on huge variety and prestige ranking
- a small custom lion pool works better as a creature roster system
- rarity, catch chance, progression, and battle identity matter more than collection rank alone

Because of that, the best move is to stop treating this as a Mudae clone and instead build a curated lion-creature game.

## High-Level Product Goal

Create a public guild game where members acquire lions, build a roster, spend coins strategically, level their lions over time, and eventually battle each other and participate in raids.

The system should feel:

- social
- collectible
- strategic
- progression-driven
- rewarding over time

## Product Principles

- Keep the first version playable with the current small lion pool.
- Reuse LionDen's existing coin system instead of inventing a second economy immediately.
- Reuse the random active-channel targeting approach from red envelopes where it helps.
- Avoid forcing full battle complexity into version 1.
- Build persistent lion ownership from the beginning so later systems layer cleanly on top.

## Core Product Decision

The best version 1 is a hybrid acquisition model:

- shop-purchased catch and spawn items using coins
- random wild lion drops in active channels
- public claiming/catching using ball-style items with different catch rates

This is stronger than using only a shop or only random drops.

### Why Not Shop Only

If lions only come from the shop:

- the experience becomes more like buying cosmetics
- there is less public excitement
- the server loses the "a lion appeared" social moment

### Why Not Random Drops Only

If lions only come from random drops:

- the small pool may feel repetitive too quickly
- some users may feel blocked by timing or bad luck
- your existing coin system becomes less important

### Why Hybrid Is Best

A hybrid system gives you:

- reliable progression through the shop
- social excitement through wild drops
- a reason to care about coins
- multiple progression paths without overcomplicating v1

## Recommended Version 1 Loop

Version 1 should focus on acquisition and roster identity, not full combat yet.

### Main Loop

1. Users earn coins through existing LionDen systems.
2. Users spend coins on catch and spawn modifiers in the shop.
3. Wild lions occasionally appear in active text channels.
4. Users try to claim or catch those lions with ball-style items.
5. Successfully obtained lions are added to the user's roster.
6. Users can inspect their lions and see their collection grow.

This gives you a real game loop quickly without needing battle logic on day one.

## Acquisition Methods

### Method 1: Shop

The shop should be part of the first meaningful version.

Recommended shop items:

- basic balls
- better balls
- bait or lure items
- rarity boosters
- type-specific attractors
- healing or utility items later

Optional later:

- temporary incense-style spawn effects
- event-only attractors

My recommendation for version 1:

- do not sell lions directly
- sell the tools used to acquire lions

Why:

- feels more game-like
- preserves excitement
- gives coins a meaningful gameplay purpose
- avoids turning the lion system into a simple catalog checkout
- fits a small lion pool better than direct purchases

### Method 2: Wild Lion Drops

Wild lion drops should be the main public event layer.

A lion appears in an active eligible channel.

Users then try to catch it using ball-style commands.

This is the closest part of the design to Poketwo and should be treated as a core feature, not a side mechanic.

## Spawn Strategy

You already have a random drop implementation for red envelopes that targets active channels.

That is a very strong foundation for this system.

Professional recommendation:

- reuse the same active-channel targeting concept
- do not copy red envelopes exactly
- adapt it for creature spawning rules

### Recommended Spawn Model

Use a hybrid active-channel spawn model:

- only configured guild channels are eligible
- recent real human activity determines which channels are candidates
- a lion spawn can target the most active qualifying channel
- only one active wild lion per channel
- only one or a small number of active wild lions per guild

This lets you reuse a familiar pattern while keeping lion drops readable and special.

### Why This Fits a Small Pool

With a small lion pool, the spawn system should be:

- controlled
- not too frequent
- not easy to farm

If wild lions spawn too often, the pool will feel exhausted very fast.

Because of that, version 1 should keep spawn rates intentionally conservative.

## Claim and Catching Model

You said you want a Pokeball-style claiming system with different claim rates based on balls.

That is a strong idea and should be part of the roadmap early.

### Recommended Catch Flow

1. A wild lion appears in a channel.
2. Users use a catch command with a chosen ball item.
3. The system calculates catch success using lion difficulty and ball strength.
4. On success, the lion is added to the user's roster.
5. On failure, the lion remains available unless the system decides the spawn expires.

### Recommended Command Shape

Possible version 1 commands:

- `~shop`
- `~buy <item>`
- `~bag`
- `~catch <ball>`
- `~lions`
- `~lion <id or name>`
- `~team`
- `~team set <lion1> <lion2> <lion3>`
- `~battle @user`
- `~toplions`

Optional later:

- `~hint`
- `~bait`
- `~use <item>`
- `~release`

### Ball Tiers

Suggested first pass:

- `Basic Ball`
- `Great Ball`
- `Ultra Ball`
- `Type Bait`
- `Rare Lure`

Each ball should have:

- coin price
- catch modifier
- possibly rarity bonus

Non-ball shop items should have:

- coin price
- duration or use count
- spawn effect
- optional type targeting
- optional rarity influence

### Catch Rate Inputs

Recommended first-pass formula inputs:

- base catch rate for the lion species
- ball bonus
- optional rarity penalty
- optional current HP or status later after battles exist

For version 1, keep it simple:

- no HP-based catching yet
- no status effects yet
- just species difficulty plus ball type

## Small-Pool Strategy

Because the lion pool is small, the system should be designed around curation rather than scale.

### What to Lean Into

- handcrafted lion identity
- clearer rarity tiers
- stronger creature uniqueness
- meaningful progression after acquisition
- player choice through items that influence what can appear

### What to Avoid Early

- pretending there is infinite variety
- overly frequent wild spawns
- heavy duplicate frustration
- ranking systems that require hundreds of creatures

## Recommended Duplicate Strategy

Version 1 should allow duplicates, but duplicates should not feel useless forever.

Recommended version 1:

- duplicates are allowed
- duplicates remain in inventory
- no merge system yet

Recommended later options:

- release duplicates for coins
- fuse duplicates for growth materials
- use duplicates to unlock passives or evolutions

## Data Model Direction

This system should be database-backed from the start.

The existing Prisma setup is the correct place for:

- lion species data
- user-owned lions
- shop inventory data
- ball inventory
- active wild spawns
- later battle and leveling records

Local images in the repo are fine for now. The database should store image paths, not raw image files.

## Suggested Core Tables

### LionSpecies

Represents a species that can spawn or be obtained.

Suggested fields:

- id
- publicId
- slug
- name
- imagePath
- rarity
- baseCatchRate
- baseValue
- spawnWeight
- primaryType
- secondaryType
- baseHp
- baseAttack
- baseDefense
- baseSpeed
- abilityKey
- abilityName
- abilityDescription
- description
- isEnabled
- createdAt
- updatedAt

### UserLion

Represents one owned lion instance.

Suggested fields:

- id
- guildId
- userId
- lionSpeciesId
- nickname
- level
- experience
- sourceType
- sourceReferenceId
- acquiredAt
- createdAt
- updatedAt

### ActiveLionSpawn

Represents a currently available wild lion in a channel.

Suggested fields:

- id
- guildId
- channelId
- lionSpeciesId
- messageId
- status
- spawnedAt
- expiresAt
- caughtByUserId
- caughtAt
- createdAt
- updatedAt

Suggested statuses:

- ACTIVE
- CAUGHT
- EXPIRED

### UserItemInventory

Represents consumable lion items owned by a user.

Suggested fields:

- id
- guildId
- userId
- itemKey
- quantity
- createdAt
- updatedAt

### ShopItemDefinition

Represents a purchasable shop item.

Suggested fields:

- id
- itemKey
- name
- category
- priceCoins
- effectType
- effectValue
- isEnabled
- createdAt
- updatedAt

## Workflow Roadmap

This is the practical implementation order I recommend.

### Phase 1: Creature Foundation

Goal:

- create a stable lion species catalog and user-owned lion model

Tasks:

- define the lion species schema
- build a simple local asset manifest for the current 27 images
- map each image to a lion species record
- decide the first rarity tiers
- decide the first base catch rate ranges

Output:

- a seeded lion species catalog ready for gameplay

### Phase 2: Shop and Ball Economy

Goal:

- connect lion acquisition to the existing coin system

Tasks:

- define shop items
- add item inventory storage
- implement `~shop`
- implement `~buy <item>`
- implement `~bag`

Output:

- users can spend coins on balls and see what they own

### Phase 3: Wild Spawns

Goal:

- make lions appear in active text channels

Tasks:

- create lion spawn scheduler/service
- adapt active-channel targeting from red envelopes
- limit active wild lions per channel/guild
- implement spawn message formatting
- add expiration behavior

Output:

- wild lions appear publicly in active channels

### Phase 4: Catching

Goal:

- let users attempt catches with their purchased items

Tasks:

- implement `~catch <ball>`
- validate user inventory
- calculate catch success
- consume the chosen ball
- award the lion on success
- post public success/failure messages

Output:

- playable acquisition loop

### Phase 5: Roster and Inspection

Goal:

- let users view what they own

Tasks:

- implement `~lions`
- implement `~lion <id or name>`
- show species info, rarity, and level
- show acquisition source if helpful

Output:

- users can see and care about their roster

### Phase 5.5: Admin Controls

Goal:

- keep moderation and balancing tools private while public gameplay stays visible

Tasks:

- keep public gameplay in message commands
- move forced wild drops into slash commands
- restrict lion admin slash commands with Manage Server permission
- expose spawn configuration and status through `/lionadmin`

Output:

- officers can manage lion spawns without normal members seeing admin controls in chat

### Phase 6: Leveling and Growth

Goal:

- make owned lions feel persistent and trainable

Tasks:

- implement `~train <lion>` as an explicit lion XP source
- use the lion level curve for training and battle rewards
- store per-lion cooldowns for progression actions
- show level-up feedback in public messages

Output:

- lions become long-term progression units

Current implementation note:

- `~train <lion>` awards lion XP on a per-owned-lion cooldown
- quick battles award winner and participation XP on a separate per-owned-lion cooldown

Important note:

- tying lion growth to gambling can be fun, but it should wait until the base lion loop is stable
- otherwise the progression design may get distorted too early

### Phase 7: Types, Abilities, and Moves

Goal:

- give each lion battle identity

Tasks:

- define type system
- define type effectiveness chart
- define move structure
- define ability/passive structure
- assign starter movesets

Output:

- a combat-ready species framework

Current implementation note:

- species now have readable codes like `L001`
- species now store base HP, attack, defense, speed, type, and ability labels
- owned lions derive battle-ready stats from species base stats plus level
- starter move sets are generated from each lion's type or dual type
- battle math supports type effectiveness, damage, and turn order

### Phase 8: Battles

Goal:

- let users fight each other using owned lions

Tasks:

- support persistent teams with up to 3 owned lions
- support `~battle @user` using both users' saved teams
- auto-resolve a first team battle format
- use speed, moves, type matchups, and derived stats
- keep richer challenge acceptance and turn menus for later

Output:

- first PvP or PvE battle loop

Current implementation note:

- `~team`, `~team set`, and `~team clear` manage persistent battle teams
- quick public team battles exist as an auto-resolved first slice
- quick team battles now create compact battle records for `~battlehistory`
- a short per-user battle start cooldown reduces public battle spam
- battle summaries call out an MVP based on damage dealt
- participating lions receive battle XP, with winners receiving more than the other team
- wild spawns now generate encounter levels, and catches preserve the spawned level
- level lures and rare lures now affect future channel spawns
- training snacks now provide an item-based lion XP sink for coins
- owned lions can be nicknamed with validated public display text
- notable rare or high-level catches feed the `~rarecatches` board
- `~toplions` gives the server a public top-10 status board using display names
- full interactive battle menus, status effects, and raids are still future phases

### Phase 9: Raids

Goal:

- create cooperative endgame content

Tasks:

- define raid bosses
- define party join flow
- define shared damage or turn structure
- define rewards

Output:

- cooperative boss fights for groups of users

## Best First Implementation

If the goal is to move forward cleanly, the best immediate playable slice is:

1. lion species catalog
2. local asset manifest
3. shop with catch and spawn item purchases
4. random wild lion drops
5. `~catch <ball>`
6. `~lions`

That is the right first milestone because it proves:

- coin integration works
- asset organization works
- public spawning works
- catch logic works
- owned lion persistence works

Without that slice, battle and raid planning will stay too abstract.

## Open Questions To Resolve Soon

- Should the shop sell only balls, or also special bait/items?
- Should wild lion drops be server-wide rare events or relatively frequent?
- Should every lion be catchable from the wild, or should some be event exclusive?
- Should duplicates be common or somewhat protected against?
- Should lion leveling come from use, time, gambling, battles, or item feeding?
- Should rare lions need stronger balls, or just have lower base catch rates?

## Current Recommendation

Build this as a single curated lion-creature system with:

- local asset-backed lion species
- shop-driven catch and spawn modifiers using coins
- active-channel wild lion spawns
- public catch attempts
- persistent user lion ownership
- later leveling, battles, and raids

That is the cleanest path from your current codebase to the game you actually want to build.
