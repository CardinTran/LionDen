import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const manifestPath = path.resolve(
  "assets/lions/lion_cards_766_unique_funny_names.csv"
);
const outputPath = path.resolve("src/features/lions/generated-lion-species.ts");

const rarities = new Set(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]);
const types = new Set([
  "NEUTRAL",
  "FIRE",
  "WATER",
  "EARTH",
  "WIND",
  "LIGHT",
  "SHADOW",
  "METAL",
  "NATURE"
]);

const rarityConfig = {
  COMMON: {
    baseCatchRate: 70,
    baseValue: 1,
    spawnWeight: 100,
    hpBonus: 0,
    statBonus: 0
  },
  UNCOMMON: {
    baseCatchRate: 60,
    baseValue: 3,
    spawnWeight: 55,
    hpBonus: 3,
    statBonus: 1
  },
  RARE: {
    baseCatchRate: 45,
    baseValue: 8,
    spawnWeight: 25,
    hpBonus: 6,
    statBonus: 2
  },
  EPIC: {
    baseCatchRate: 32,
    baseValue: 20,
    spawnWeight: 10,
    hpBonus: 9,
    statBonus: 3
  },
  LEGENDARY: {
    baseCatchRate: 20,
    baseValue: 50,
    spawnWeight: 3,
    hpBonus: 12,
    statBonus: 4
  }
};

const typeStats = {
  NEUTRAL: { hp: 52, attack: 10, defense: 10, speed: 10 },
  FIRE: { hp: 50, attack: 13, defense: 9, speed: 12 },
  WATER: { hp: 54, attack: 10, defense: 12, speed: 9 },
  EARTH: { hp: 58, attack: 10, defense: 14, speed: 7 },
  WIND: { hp: 48, attack: 11, defense: 9, speed: 14 },
  LIGHT: { hp: 52, attack: 12, defense: 10, speed: 12 },
  SHADOW: { hp: 50, attack: 13, defense: 9, speed: 13 },
  METAL: { hp: 56, attack: 11, defense: 14, speed: 8 },
  NATURE: { hp: 55, attack: 11, defense: 12, speed: 9 }
};

const typeAbilities = {
  NEUTRAL: {
    abilityKey: "steady-heart",
    abilityName: "Steady Heart",
    abilityDescription:
      "A balanced passive trait reserved for future battle effects."
  },
  FIRE: {
    abilityKey: "festival-spark",
    abilityName: "Festival Spark",
    abilityDescription:
      "An energetic passive trait reserved for future battle effects."
  },
  WATER: {
    abilityKey: "rain-drum-rhythm",
    abilityName: "Rain Drum Rhythm",
    abilityDescription:
      "A flowing passive trait reserved for future battle effects."
  },
  EARTH: {
    abilityKey: "grounded-stance",
    abilityName: "Grounded Stance",
    abilityDescription:
      "A sturdy passive trait reserved for future battle effects."
  },
  WIND: {
    abilityKey: "banner-step",
    abilityName: "Banner Step",
    abilityDescription:
      "A quick passive trait reserved for future battle effects."
  },
  LIGHT: {
    abilityKey: "golden-presence",
    abilityName: "Golden Presence",
    abilityDescription:
      "A bright passive trait reserved for future battle effects."
  },
  SHADOW: {
    abilityKey: "night-market-prowl",
    abilityName: "Night Market Prowl",
    abilityDescription:
      "A sly passive trait reserved for future battle effects."
  },
  METAL: {
    abilityKey: "cymbal-guard",
    abilityName: "Cymbal Guard",
    abilityDescription:
      "A resilient passive trait reserved for future battle effects."
  },
  NATURE: {
    abilityKey: "garden-stride",
    abilityName: "Garden Stride",
    abilityDescription:
      "A lively passive trait reserved for future battle effects."
  }
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((entry) => entry.length > 1 || entry[0]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hashText(text) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function variance(seed, salt, maxInclusive) {
  return hashText(`${seed}:${salt}`) % (maxInclusive + 1);
}

function buildStats(row) {
  const rarity = rarityConfig[row.rarity];
  const primary = typeStats[row.primaryType];
  const secondary = row.secondaryType ? typeStats[row.secondaryType] : null;
  const seed = `${row.publicId}:${row.slug}:${row.rarity}:${row.primaryType}:${row.secondaryType ?? ""}`;
  const blend = (stat) =>
    secondary
      ? Math.floor((primary[stat] * 2 + secondary[stat]) / 3)
      : primary[stat];

  return {
    baseHp: blend("hp") + rarity.hpBonus + variance(seed, "hp", 6),
    baseAttack:
      blend("attack") + rarity.statBonus + variance(seed, "attack", 3),
    baseDefense:
      blend("defense") + rarity.statBonus + variance(seed, "defense", 3),
    baseSpeed: blend("speed") + rarity.statBonus + variance(seed, "speed", 3)
  };
}

function buildSpecies(row) {
  const rarity = rarityConfig[row.rarity];
  const ability = typeAbilities[row.primaryType];

  return {
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    imagePath: row.imagePath,
    rarity: row.rarity,
    baseCatchRate: rarity.baseCatchRate,
    baseValue: rarity.baseValue,
    spawnWeight: rarity.spawnWeight,
    primaryType: row.primaryType,
    secondaryType: row.secondaryType || null,
    ...buildStats(row),
    ...ability,
    description: row.description
  };
}

const [header, ...rows] = parseCsv(await readFile(manifestPath, "utf8"));
const columnIndexes = Object.fromEntries(
  header.map((columnName, index) => [columnName, index])
);
const requiredColumns = [
  "publicId",
  "slug",
  "name",
  "rarity",
  "primaryType",
  "secondaryType",
  "imagePath",
  "description"
];

for (const columnName of requiredColumns) {
  assert(
    columnIndexes[columnName] !== undefined,
    `Manifest is missing required column: ${columnName}`
  );
}

const seen = {
  publicId: new Set(),
  slug: new Set(),
  name: new Set(),
  imagePath: new Set()
};

const species = rows.map((row, index) => {
  const rowNumber = index + 2;
  const entry = Object.fromEntries(
    requiredColumns.map((columnName) => [
      columnName,
      row[columnIndexes[columnName]]
    ])
  );
  const expectedPublicId = `L${String(index + 1).padStart(4, "0")}`;
  const expectedImagePath = `lions/${entry.rarity.toLowerCase()}/${entry.slug}.jpg`;

  assert(
    entry.publicId === expectedPublicId,
    `Row ${rowNumber}: expected publicId ${expectedPublicId}`
  );
  assert(rarities.has(entry.rarity), `Row ${rowNumber}: invalid rarity`);
  assert(
    types.has(entry.primaryType),
    `Row ${rowNumber}: invalid primary type`
  );
  assert(
    !entry.secondaryType || types.has(entry.secondaryType),
    `Row ${rowNumber}: invalid secondary type`
  );
  assert(
    !entry.secondaryType || entry.secondaryType !== entry.primaryType,
    `Row ${rowNumber}: secondary type must differ from primary type`
  );
  assert(
    entry.imagePath === expectedImagePath,
    `Row ${rowNumber}: expected imagePath ${expectedImagePath}`
  );
  assert(
    !entry.imagePath.startsWith("assets/lions/cards/"),
    `Row ${rowNumber}: imagePath uses legacy local card path`
  );

  for (const [key, values] of Object.entries(seen)) {
    assert(!values.has(entry[key]), `Row ${rowNumber}: duplicate ${key}`);
    values.add(entry[key]);
  }

  return buildSpecies(entry);
});

const output = `import type { LionSpeciesSeed } from "./lion-seed-data.js";

// Generated by scripts/generate-lion-species-seed.mjs from assets/lions/lion_cards_766_unique_funny_names.csv.
export const DEFAULT_LION_SPECIES = ${JSON.stringify(species, null, 2)} as const satisfies readonly LionSpeciesSeed[];
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);

globalThis.console.log(
  `Generated ${species.length} lion species in ${path.relative(process.cwd(), outputPath)}`
);
