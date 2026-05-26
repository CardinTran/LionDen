# Next Roadmap: Team Activity Systems

LionDen's next product direction is Team Houses and a lightweight House Cup. This should build on the existing participation, weekly challenge, red envelope, practice, and lion systems without turning the bot into a spam leaderboard.

## Product Direction

The next major loop should make team activity visible at the group level:

- members belong to optional Team Houses
- normal participation contributes to house progress
- a recurring House Cup summarizes house standings
- officers can manage house membership and correct obvious mistakes
- house scoring should reward real activity more than raw message volume

The first version should stay small and reversible. It should prove whether team-based goals motivate healthy participation before adding complicated seasons, perks, or custom house economies.

## Design Principles

- Keep individual progression and house progression connected, but not identical.
- Prefer existing activity hooks over new spam-friendly actions.
- Make standings understandable enough that members know why a house moved.
- Give officers simple admin controls before adding automation-heavy systems.
- Treat House Cup rewards as modest recognition, not a second economy.
- Keep the data model flexible enough for future seasons without overbuilding the first pass.

## Suggested First Pass

1. Define Team Houses at the guild level.
2. Let officers create, rename, archive, and assign members to houses.
3. Track house points from selected existing activities:
   - practice attendance
   - weekly challenge completion
   - red envelope claims
   - lion catches or training
   - Training Hall or duel participation only if the hook is clean
4. Add a public house standings view.
5. Add an officer-only house admin view.
6. Add a simple recurring House Cup period, likely weekly or monthly.
7. Document scoring clearly before expanding rewards.

## Out of Scope For The First Pass

- real-money or fundraising mechanics
- complicated house perks
- permanent competitive imbalance
- anonymous or hidden scoring
- production deployment changes
- large Discord role synchronization
- seasonal event systems
- custom house shops

## Open Product Questions

- Should every member be assigned to a house, or should houses be opt-in first?
- Should House Cup periods be weekly, monthly, or manually reset by officers?
- Should points come directly from existing XP/coins, or use a separate house score?
- Should duel participation count once interactive duels graduate beyond prototype status?
- What officer workflow is simplest for correcting house assignments and points?

## Implementation Notes

This roadmap is not an implementation plan yet. Before building, inspect the existing challenge hooks, profile service, admin command patterns, and guild configuration models. If house scoring needs persistence, update `docs/DATA_MODEL.md` with any Prisma changes in the same PR that introduces those changes.

Interactive duels should not automatically become House Cup scoring until their lifecycle and persistence model are clearer.
