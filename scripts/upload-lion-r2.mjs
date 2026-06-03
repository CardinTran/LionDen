import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const outputRoot = path.resolve("_r2_upload");
const bucketName = process.argv[2];
const verifyOnly = process.argv.includes("--verify-only");
const concurrency = 8;

assert(bucketName, "Usage: npm run lions:r2:upload -- <bucket-name>");
assert(
  /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucketName),
  "Bucket name must use lowercase letters, numbers, or hyphens"
);

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? process.execPath : "wrangler";
    const commandArgs = isWindows
      ? [
          path.join(
            process.env.APPDATA,
            "npm",
            "node_modules",
            "wrangler",
            "bin",
            "wrangler.js"
          ),
          ...args
        ]
      : args;
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      windowsHide: true
    });
    let stderr = "";

    child.stdout.on("data", () => {});
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `Wrangler exited with code ${code}`));
      }
    });
  });
}

async function retry(operation) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) =>
          globalThis.setTimeout(resolve, attempt * 1000)
        );
      }
    }
  }

  throw lastError;
}

async function runConcurrent(items, operation, label) {
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await operation(items[index]);
      completed += 1;

      if (completed % 25 === 0 || completed === items.length) {
        globalThis.console.log(`${label}: ${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
}

const files = await listFiles(outputRoot);
assert(
  files.length > 0,
  "No staged lion images found. Run npm run lions:r2:prepare first."
);

const objects = files.map((filePath) => ({
  filePath,
  key: path.relative(outputRoot, filePath).split(path.sep).join("/")
}));

if (!verifyOnly) {
  await runConcurrent(
    objects,
    ({ filePath, key }) =>
      retry(() =>
        runWrangler([
          "r2",
          "object",
          "put",
          `${bucketName}/${key}`,
          "--file",
          filePath,
          "--content-type",
          "image/jpeg",
          "--cache-control",
          "public,max-age=31536000,immutable",
          "--remote",
          "--force"
        ])
      ),
    "Uploaded"
  );
}

const verifyRoot = await mkdtemp(path.join(os.tmpdir(), "lionden-r2-verify-"));

try {
  await runConcurrent(
    objects,
    async ({ filePath, key }) => {
      const verifyPath = path.join(
        verifyRoot,
        `${createHash("sha256").update(key).digest("hex")}.jpg`
      );
      await retry(() =>
        runWrangler([
          "r2",
          "object",
          "get",
          `${bucketName}/${key}`,
          "--file",
          verifyPath,
          "--remote"
        ])
      );
      const [localHash, remoteHash] = await Promise.all([
        hashFile(filePath),
        hashFile(verifyPath)
      ]);

      assert(localHash === remoteHash, `Remote hash mismatch for ${key}`);
    },
    "Verified"
  );
} finally {
  await rm(verifyRoot, { recursive: true, force: true });
}

globalThis.console.log(
  `${verifyOnly ? "Verified" : "Uploaded and verified"} ${objects.length} R2 objects in ${bucketName}`
);
