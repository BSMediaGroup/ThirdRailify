import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionRoots = ["functions", "cloudflare", "scripts"].map((value) => path.join(root, value));
const excluded = new Set(["assert-no-kv-mutations.mjs"]);
const findings = { puts: [], deletes: [], lists: [], restWrites: [], wranglerMutations: [] };

for (const sourceRoot of productionRoots) {
  for (const file of await files(sourceRoot)) {
    if (excluded.has(path.basename(file))) continue;
    const source = await readFile(file, "utf8");
    scan(file, source, /(?:THIRDRAILIFY_COMMUNITY_KV|legacyKv|legacy_kv)\s*\.\s*put\s*\(/g, findings.puts);
    scan(file, source, /(?:THIRDRAILIFY_COMMUNITY_KV|legacyKv|legacy_kv)\s*\.\s*delete\s*\(/g, findings.deletes);
    scan(file, source, /(?:THIRDRAILIFY_COMMUNITY_KV|legacyKv|legacy_kv)\s*\.\s*list\s*\(/g, findings.lists);
    scan(file, source, /api\.cloudflare\.com\/client\/v4[^\n]*(?:storage\/kv|namespaces)[^\n]*(?:PUT|DELETE)/gi, findings.restWrites);
    scan(file, source, /wrangler\s+(?:kv(?::|\s+)(?:put|delete|bulk)|kv:bulk)/gi, findings.wranglerMutations);
  }
}

for (const [kind, values] of Object.entries(findings)) assert.deepEqual(values, [], `forbidden KV ${kind}: ${values.join(", ")}`);
console.log(JSON.stringify({ kv_puts: 0, kv_deletes: 0, kv_lists: 0, kv_rest_writes: 0, wrangler_kv_mutations: 0 }));

async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(full));
    else if (/\.(?:js|mjs|cjs|ts|cmd|ps1)$/i.test(entry.name)) output.push(full);
  }
  return output;
}

function scan(file, source, pattern, target) {
  for (const match of source.matchAll(pattern)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    target.push(`${path.relative(root, file)}:${line}`);
  }
}
