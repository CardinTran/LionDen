import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const manifestPath = path.resolve(
  "assets/lions/lion_cards_766_unique_funny_names.csv"
);
const outputRoot = path.resolve("_r2_upload");
const allowedRarities = new Set([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY"
]);

assert(
  outputRoot === path.join(process.cwd(), "_r2_upload"),
  "Staging cleanup must stay inside the repository"
);

await rm(outputRoot, { recursive: true, force: true });

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

  return rows;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

const [header, ...rows] = parseCsv(await readFile(manifestPath, "utf8"));
const requiredColumns = [
  "originalFile",
  "publicId",
  "slug",
  "name",
  "rarity",
  "imagePath"
];
const columnIndexes = Object.fromEntries(
  header.map((columnName, index) => [columnName, index])
);

for (const columnName of requiredColumns) {
  assert(
    columnIndexes[columnName] !== undefined,
    `Manifest is missing required column: ${columnName}`
  );
}

const publicIds = new Set();
const slugs = new Set();
const names = new Set();
const imagePaths = new Set();
const stagedPaths = new Set();
const rarityCounts = {};

for (const [index, row] of rows.entries()) {
  const rowNumber = index + 2;
  const originalFile = row[columnIndexes.originalFile];
  const publicId = row[columnIndexes.publicId];
  const slug = row[columnIndexes.slug];
  const name = row[columnIndexes.name];
  const rarity = row[columnIndexes.rarity];
  const imagePath = row[columnIndexes.imagePath];
  const expectedImagePath = `lions/${rarity.toLowerCase()}/${slug}.jpg`;

  assert(
    allowedRarities.has(rarity),
    `Row ${rowNumber}: invalid rarity ${rarity}`
  );
  assert(
    publicId === `L${String(index + 1).padStart(4, "0")}`,
    `Row ${rowNumber}: expected sequential publicId`
  );
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    `Row ${rowNumber}: invalid slug ${slug}`
  );
  assert(
    imagePath === expectedImagePath,
    `Row ${rowNumber}: imagePath must be ${expectedImagePath}`
  );
  assert(
    !publicIds.has(publicId),
    `Row ${rowNumber}: duplicate publicId ${publicId}`
  );
  assert(!slugs.has(slug), `Row ${rowNumber}: duplicate slug ${slug}`);
  assert(!names.has(name), `Row ${rowNumber}: duplicate name ${name}`);
  assert(
    !imagePaths.has(imagePath),
    `Row ${rowNumber}: duplicate imagePath ${imagePath}`
  );

  const sourcePath = path.resolve(originalFile);
  const stagedPath = path.resolve(outputRoot, imagePath);

  assert(
    sourcePath.startsWith(`${process.cwd()}${path.sep}`),
    `Row ${rowNumber}: originalFile must stay inside the repository`
  );
  assert(
    stagedPath.startsWith(`${outputRoot}${path.sep}`),
    `Row ${rowNumber}: imagePath escapes the staging folder`
  );

  await mkdir(path.dirname(stagedPath), { recursive: true });
  await copyFile(sourcePath, stagedPath);

  publicIds.add(publicId);
  slugs.add(slug);
  names.add(name);
  imagePaths.add(imagePath);
  stagedPaths.add(stagedPath);
  rarityCounts[rarity] = (rarityCounts[rarity] ?? 0) + 1;
}

const unexpectedFiles = (await listFiles(outputRoot)).filter(
  (filePath) => !stagedPaths.has(filePath)
);

assert(
  unexpectedFiles.length === 0,
  `Staging folder contains unexpected files:\n${unexpectedFiles.join("\n")}`
);

globalThis.console.log(`Prepared ${rows.length} lion images in ${outputRoot}`);
globalThis.console.log(JSON.stringify(rarityCounts, null, 2));
