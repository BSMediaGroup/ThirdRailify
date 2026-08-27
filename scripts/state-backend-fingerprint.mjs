import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "cloudflare/state-worker/index.js",
  "cloudflare/state-worker/state-core.js",
  "cloudflare/state-worker/wrangler.jsonc",
  "functions/api/_snapshot-persistence.js",
  "functions/api/_state-backend.js",
  "functions/api/_state-contract.js",
  "functions/api/community/_community.js",
  "functions/api/community/discord.js",
  "functions/api/community/discord/ingest.js",
  "functions/api/state-backend.js",
  "functions/live.js",
  "functions/api/watch.js",
  "functions/api/watch/_episodes.js",
  "functions/api/watch/_watch.js",
  "functions/api/watch/episodes.js",
  "functions/api/watch/episodes/[episodeId].js",
  "functions/api/watch/ingest.js",
  "functions/api/watch/manage.js",
  "functions/api/watch/thumbnail.js",
  "public/_routes.json",
  "wrangler.jsonc",
];

const hash = createHash("sha256");
for (const relative of files) {
  let source = await readFile(path.join(root, relative), "utf8");
  if (relative.endsWith("_state-contract.js")) {
    source = source.replace(/STATE_BACKEND_SOURCE_FINGERPRINT = "[^"]+"/, 'STATE_BACKEND_SOURCE_FINGERPRINT = "<normalized>"');
  }
  hash.update(`${relative.replaceAll("\\", "/")}\n${source.replaceAll("\r\n", "\n")}\n`);
}
const actual = hash.digest("hex").slice(0, 16);

if (process.argv.includes("--check")) {
  const contract = await import("../functions/api/_state-contract.js");
  if (contract.STATE_BACKEND_SOURCE_FINGERPRINT !== actual) {
    console.error(`STALE expected=${actual} declared=${contract.STATE_BACKEND_SOURCE_FINGERPRINT}`);
    process.exitCode = 2;
  } else {
    console.log(`CURRENT ${actual}`);
  }
} else {
  console.log(actual);
}
