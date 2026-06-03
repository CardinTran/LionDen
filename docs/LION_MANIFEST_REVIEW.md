# Lion Photo Manifest Review

## Scope

The lion photo manifest covers the visually reviewed keeper collection:

- `723` photos from `_unique_photoset`
- `43` explicitly marked photos from `_legendary_photoset`
- `766` total manifest rows

The CSV stores the original raw source path in `originalFile` and the R2 object
key in `imagePath`. Runtime species data uses `imagePath`; it does not require
the original raw image folders to exist in production.

Manifest:

- `assets/lions/lion_cards_766_unique_funny_names.csv`

## Rarity Counts

The marked legendary collection remains exactly `43` photos. The remaining
`723` keeper photos use the requested approximate distribution.

| Rarity      | Count | Share of non-legendary keepers |
| ----------- | ----: | -----------------------------: |
| `COMMON`    |   398 |                          55.0% |
| `UNCOMMON`  |   181 |                          25.0% |
| `RARE`      |    86 |                          11.9% |
| `EPIC`      |    58 |                           8.0% |
| `LEGENDARY` |    43 |         Marked collection only |

## Primary Type Counts

| Type      | Count |
| --------- | ----: |
| `NEUTRAL` |    85 |
| `FIRE`    |    85 |
| `WATER`   |    85 |
| `EARTH`   |    85 |
| `WIND`    |    85 |
| `LIGHT`   |    85 |
| `SHADOW`  |    86 |
| `METAL`   |    85 |
| `NATURE`  |    85 |

## Visual Review

The collection was reviewed in `39` labeled contact sheets. The photos include:

- tent festival meet-and-greets and team portraits
- night-market walks and lantern-lit performances
- outdoor festival jumps, chair routines, flags, and crowd interactions
- ceremony courtyard, school, church, and community events
- Lunar New Year venue photos and backstage resting-lion shots
- ballroom and garden wedding receptions
- stage, drumline, recruiting, scenic sunset, and team-life photos

`379` rows are marked `REVIEWED`. `387` rows are marked `NEEDS_REVIEW`.
The review queue is intentionally conservative: it includes close sequence
frames, weak-subject photos, scenic photos, and behind-the-scenes photos where
the best gameplay card choice is subjective. Filter the manifest by
`reviewStatus=NEEDS_REVIEW` for the full queue.

## Skipped Photos

No selected keeper photos were skipped.

The manifest includes all `723` photos from `_unique_photoset` and all `43`
photos from `_legendary_photoset`.

## Duplicate Concerns

The two source folders contain no byte-for-byte duplicate images across the
combined `766` photos.

There are two filename collisions across folders:

- `_unique_photoset/IMG_0653.JPG` and `_legendary_photoset/IMG_0653.JPG`
- `_unique_photoset/IMG_0952.JPG` and `_legendary_photoset/IMG_0952.JPG`

Their image contents differ. `originalFile` includes the folder path so each
manifest row stays unambiguous.

Several event bursts still contain near-duplicate or closely related photos,
especially ballroom, banquet, garden-reception, and team-hangout sequences.
Those rows are retained because they belong to the selected keeper set and are
marked `NEEDS_REVIEW` where a manual trim would be useful.

## Naming Rules

Names are unique, funny, and scene-aware. They combine:

- a visual adjective based on the assigned primary type
- a scene motif such as `Tent`, `Night Market`, `Wedding Aisle`, or `Drumline`
- a playful role such as `Snack Inspector`, `Aisle Chaperone`, or
  `Confetti Accountant`
- a playful edition label for close sequence photos when needed for uniqueness

`slug` values are unique lowercase kebab-case identifiers. `publicId` values
are sequential from `L0001` through `L0766`.

The upload-ready manifest keeps each `slug` unique by deriving it from the
canonical `imagePath` filename. Display names remain independently editable
flavor text. The completed naming pass keeps all `766` display names unique and
uses edition labels such as `Second Shift`, `Overtime`, and `Director's Cut`
for closely related sequence photos instead of numeric suffixes.

## Type Rules

Primary and secondary types follow the requested visual language:

- bright, golden, and majestic photos lean `LIGHT`
- dark, night, and serious photos lean `SHADOW`
- green outdoor scenes lean `NATURE`
- red and orange energetic scenes lean `FIRE`
- blue-dominant scenes lean `WATER`
- stage, drumline, and equipment scenes lean `METAL`
- motion-heavy outdoor festival scenes can lean `WIND`
- grounded ceremony and group scenes can lean `EARTH`
- casual, scenic, weak-subject, or unclear photos lean `NEUTRAL`

Secondary types preserve useful scene context when it differs from the primary
type.

## R2 Preparation

Each `imagePath` is an R2 object key, not a URL:

```text
lions/<rarity>/<slug>.jpg
```

For example:

```text
lions/common/easygoing-tent-snack-inspector.jpg
```

Prepare local upload copies without moving or renaming raw photos:

```sh
npm run lions:r2:prepare
```

The generated `_r2_upload` folder is ignored by Git and mirrors the exact R2
object-key layout. Upload it with `rclone copy _r2_upload r2:<bucket-name>`.
After remote verification, remove `_r2_upload` and the two local-only raw
working folders from the repository checkout. Restore the raw folders from
their archive only when rebuilding an upload tree.

## Runtime Seed Generation

Runtime lion species are generated from this manifest into:

```text
src/features/lions/generated-lion-species.ts
```

Regenerate after approved CSV changes:

```sh
npm run lions:manifest:generate
```

The generated seed includes manifest identity fields plus deterministic gameplay
values for catch rate, spawn weight, base value, stats, and placeholder ability
labels.

## Recommended Next Steps

1. Review manifest rows marked `NEEDS_REVIEW`, starting with the legendary
   scenic and behind-the-scenes photos.
2. Decide whether close event bursts should stay as separate collectible
   species or be trimmed to one preferred card per moment.
3. Confirm the final naming tone and type balance before generating seed data.
4. Run `npm run lions:r2:prepare` to rebuild the upload-ready copy tree.
5. Upload `_r2_upload` with `rclone` only after the manifest and staged asset
   set are approved.
