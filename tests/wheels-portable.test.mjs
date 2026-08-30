/* eslint-disable no-control-regex */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  THIRD_RAIL_GOLD_CONFIG,
  WHEEL_FILE_FORMAT_ID,
  WHEEL_FILE_FORMAT_VERSION,
  canonicalStringify,
  createPortableWheel,
  embedCurrentWheelMedia,
  encodeBase64,
  parseWheelImport,
  safeWheelFilename,
  serializePortableWheel,
  sha256Hex,
} from "../src/wheels/portable.mjs";

const entries = [
  { id: "authoritative-id-must-not-export", label: "Beta", order: 1, weight: 2, colour: "#d50f25", state: "hidden" },
  { id: "another-authoritative-id", label: "Alpha", order: 0, weight: 1, colour: null, state: "active" },
];
const wheel = { slug: "source-only", title: "Portable test", description: "Creator content", config: { ...THIRD_RAIL_GOLD_CONFIG, palette: [...THIRD_RAIL_GOLD_CONFIG.palette] }, entries };

test("canonical .twl serialization is deterministic, ordered, hashed, and authority-free", async () => {
  const document = await createPortableWheel(wheel, { exportedAt: "2026-08-29T00:00:00.000Z", generatorVersion: "test", sourceSlug: "source-only" });
  assert.equal(document.format, WHEEL_FILE_FORMAT_ID); assert.equal(document.formatVersion, WHEEL_FILE_FORMAT_VERSION);
  assert.deepEqual(document.wheel.entries.map((entry) => entry.label), ["Alpha", "Beta"]);
  assert.deepEqual(document.wheel.entries.map((entry) => entry.color), [null, "#D50F25"]);
  assert.equal(document.integrity.wheelPayload, await sha256Hex(canonicalStringify(document.wheel)));
  const text = serializePortableWheel(document); assert.equal(text, serializePortableWheel(document)); assert.match(text, /\n\s{2}"format"/);
  for (const forbidden of ["authoritative-id-must-not-export", "another-authoritative-id", "recentOfficialResults", "latestOfficialResult", "owner", "revision", "r2", "signedUrl", "audit"]) assert.equal(text.includes(forbidden), false, forbidden);
});

test(".twl and ordinary JSON round-trip to fresh entry identity", async () => {
  const document = await createPortableWheel(wheel, { exportedAt: "2026-08-29T00:00:00.000Z" }); const text = serializePortableWheel(document);
  for (const sourceName of ["portable.twl", "portable.json", "misleading.wheel"]) {
    const parsed = await parseWheelImport(text, { sourceName }); assert.equal(parsed.detectedFormat, "thirdrailify"); assert.equal(parsed.proposals[0].integrityStatus, "verified"); assert.deepEqual(parsed.proposals[0].entries.map((entry) => entry.label), ["Alpha", "Beta"]); assert.equal(parsed.proposals[0].entries.some((entry) => entries.some((original) => original.id === entry.id)), false);
  }
});

test("canonical import rejects corrupt hashes, future/malformed versions, authority fields, and unsafe keys", async () => {
  const document = await createPortableWheel(wheel, { exportedAt: "2026-08-29T00:00:00.000Z" });
  await assert.rejects(() => parseWheelImport(JSON.stringify({ ...document, integrity: { ...document.integrity, wheelPayload: "0".repeat(64) } })), /integrity hash does not match/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify({ ...document, formatVersion: WHEEL_FILE_FORMAT_VERSION + 1 })), new RegExp(`version ${WHEEL_FILE_FORMAT_VERSION + 1} is not supported`, "i"));
  await assert.rejects(() => parseWheelImport(JSON.stringify({ ...document, formatVersion: "1" })), /version is malformed/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify({ ...document, ownerAccountId: "forbidden" })), /unsupported document field/i);
  await assert.rejects(() => parseWheelImport('{"entries":[{"label":"A","__proto__":{"polluted":true}}]}'), /unsafe JSON key/i);
  await assert.rejects(() => parseWheelImport('{"entries":[{"label":"A","constructor":{"prototype":{"polluted":true}}}]}'), /unsafe JSON key/i);
});

test("bounds reject deep objects, oversized arrays, strings, and invalid participant values", async () => {
  let deep = "{}"; for (let index = 0; index < 40; index += 1) deep = `{"x":${deep}}`; await assert.rejects(() => parseWheelImport(deep), /nested too deeply/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify(Array.from({ length: 1001 }, (_, index) => `Entry ${index}`))), /1000-entry limit/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify(["x".repeat(121)])), /between 1 and 120/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify({ entries: [{ label: "A", weight: 0 }] })), /weight must be an integer/i);
  await assert.rejects(() => parseWheelImport(JSON.stringify({ entries: [{ label: "A", color: "red" }] })), /six-digit hex/i);
});

test("safe filenames are bounded and cannot contain paths or controls", () => {
  const value = safeWheelFilename(" ../My \\ unsafe\u0000 wheel:*? ".replace("\\u0000", "\u0000"), "twl"); assert.equal(value, "My-unsafe-wheel.twl"); assert.ok(value.length <= 84); assert.equal(/[\\/:*?"<>|\u0000-\u001f]/.test(value), false);
});

test("embedded media has independent SHA-256 and round-trips without a data URL", async () => {
  const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]); const media = { mode: "embedded", fileName: "centre.png", mimeType: "image/png", sha256: await sha256Hex(png), base64: encodeBase64(png) };
  const document = await createPortableWheel(wheel, { media: { background: null, center: media } }); const text = serializePortableWheel(document); assert.equal(text.includes("data:image"), false);
  const parsed = await parseWheelImport(text); assert.equal(parsed.proposals[0].media.center.sha256, media.sha256);
  const corrupt = structuredClone(document); corrupt.wheel.media.center.sha256 = "0".repeat(64); corrupt.integrity.wheelPayload = await sha256Hex(canonicalStringify(corrupt.wheel)); await assert.rejects(() => parseWheelImport(JSON.stringify(corrupt)), /embedded center image hash/i);
});

test("supplied Wheel of Names sample maps eight entries, four colours, sounds, spin and warnings", async () => {
  const bytes = new Uint8Array(await readFile(new URL("./fixtures/wheel-of-names-sample.wheel", import.meta.url))); const parsed = await parseWheelImport(bytes, { sourceName: "WHEELOFNAMES.wheel" }); const proposal = parsed.proposals[0];
  assert.equal(parsed.detectedFormat, "wheel-of-names"); assert.equal(parsed.proposals.length, 1); assert.equal(proposal.title, "WHEELOFNAMES");
  assert.deepEqual(proposal.entries.map((entry) => entry.label), ["Ali", "Beatriz", "Charles", "Diya", "Eric", "Fatima", "Gabriel", "Hanna"]);
  assert.deepEqual(proposal.config.palette, ["#3369E8", "#D50F25", "#EEB211", "#009925"]); assert.deepEqual(proposal.entries.map((entry) => entry.colour), ["#3369E8", "#D50F25", "#EEB211", "#009925", "#3369E8", "#D50F25", "#EEB211", "#009925"]);
  assert.equal(proposal.config.spinDurationMs, 10_000); assert.equal(proposal.config.tickingSoundEnabled, true); assert.equal(proposal.config.winnerSoundEnabled, true); assert.equal(proposal.config.confettiEnabled, true); assert.deepEqual(proposal.media, { background: null, center: null });
  assert.ok(proposal.messages.some((item) => item.sourceField === "entries[].id")); assert.ok(proposal.messages.some((item) => item.severity === "warning" && item.sourceField === "drawShadow")); assert.ok(proposal.messages.some((item) => item.sourceField === "shareMode"));
  assert.equal(proposal.entries.some((entry) => /^sample-/.test(entry.id)), false);
});

test("Wheel of Names multiple configs remain selectable one at a time and clamp spin duration", async () => {
  const source = { wheelConfigs: [{ title: "One", entries: [{ text: "A" }], colorSettings: [], spinTime: 1 }, { title: "Two", entries: [{ text: "B" }, { text: "B" }], colorSettings: [], spinTime: 99 }] };
  const parsed = await parseWheelImport(JSON.stringify(source), { sourceName: "many.wheel" }); assert.equal(parsed.proposals.length, 2); assert.equal(parsed.proposals[0].config.spinDurationMs, 2000); assert.equal(parsed.proposals[1].config.spinDurationMs, 60000); assert.equal(parsed.proposals[1].summary.duplicateLabelCount, 2); assert.ok(parsed.proposals[0].messages.some((item) => item.sourceField === "spinTime" && item.severity === "warning"));
});

test("Wheel of Names media stays local, validates data URIs, rejects unsafe SVG, and reports lossy settings", async () => {
  const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]); const pngData = `data:image/png;base64,${encodeBase64(png)}`;
  const parsed = await parseWheelImport(JSON.stringify({ wheelConfigs: [{ title: "Media", entries: [{ text: "A" }], colorSettings: [], customPictureDataUri: pngData, customPictureName: "centre.png", autoRemoveWinner: true, displayWinnerDialog: false, font: "Arial" }] }));
  const proposal = parsed.proposals[0]; assert.equal(proposal.media.center.mimeType, "image/png"); assert.equal(proposal.media.center.sha256, await sha256Hex(png)); assert.ok(proposal.messages.some((item) => item.sourceField === "customPictureDataUri" && /will not upload until Save/i.test(item.reason))); assert.ok(proposal.messages.some((item) => item.sourceField === "autoRemoveWinner" && item.severity === "warning")); assert.ok(proposal.messages.some((item) => item.sourceField === "displayWinnerDialog" && item.severity === "warning")); assert.ok(proposal.messages.some((item) => item.sourceField === "font" && item.severity === "warning"));
  await assert.rejects(() => parseWheelImport(JSON.stringify({ wheelConfigs: [{ entries: [{ text: "A" }], customPictureDataUri: "not-a-data-uri" }] })), /invalid data URI/i);
  const unsafeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>alert(1)</script></svg>').toString("base64"); await assert.rejects(() => parseWheelImport(JSON.stringify({ wheelConfigs: [{ entries: [{ text: "A" }], customCoverImageDataUri: `data:image/svg+xml;base64,${unsafeSvg}` }] })), /executable, external, or unsafe/i);
});

test("portable media export fetches only authorized same-origin routes and verifies projected hashes", async () => {
  const priorWindow = globalThis.window; globalThis.window = { location: { origin: "https://public.example" } };
  try {
    const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]); const hash = await sha256Hex(png); const source = { media: { background: { url: "/api/wheels/media/0123456789abcdef", contentType: "image/png", sha256: hash }, centre: null } };
    const media = await embedCurrentWheelMedia(source, async (url, init) => { assert.equal(url, "/api/wheels/media/0123456789abcdef"); assert.equal(init.credentials, "include"); return new Response(png, { headers: { "Content-Type": "image/png" } }); }); assert.equal(media.background.sha256, hash); assert.equal(media.background.fileName, "background.png"); assert.equal(JSON.stringify(media).includes("/api/wheels/media"), false);
    await assert.rejects(() => embedCurrentWheelMedia({ media: { background: { ...source.media.background, url: "https://evil.example/image.png" }, centre: null } }, async () => new Response(png)), /authorized same-origin/i);
    await assert.rejects(() => embedCurrentWheelMedia({ media: { background: { ...source.media.background, sha256: "0".repeat(64) }, centre: null } }, async () => new Response(png, { headers: { "Content-Type": "image/png" } })), /hash did not match/i);
  } finally { globalThis.window = priorWindow; }
});

test("V2 embeds one GIF for reused palette and participant image styles and imports logical references", async () => {
  const priorWindow = globalThis.window; globalThis.window = { location: { origin: "https://public.example" } };
  try {
    const gif = Uint8Array.from([0x47,0x49,0x46,0x38,0x39,0x61,0x02,0x00,0x02,0x00,0x80,0,0,0,0,0,255,255,255,0x2c,0,0,0,0,2,0,2,0,0,2,2,0x44,1,0,0x3b]); const hash = await sha256Hex(gif); const assetId = "01234567-89ab-4cde-8fab-0123456789ab";
    const source = { ...wheel, config: { ...wheel.config, themePreset: "custom", palette: ["#112233"], paletteStyles: [{ mode: "image", color: "#112233", imageAssetId: assetId }] }, entries: wheel.entries.map((entry) => ({ ...entry, style: { mode: "image", color: "#112233", imageAssetId: assetId } })), media: { background: null, centre: null, segmentFills: [{ id: assetId, url: `/api/wheels/media/${assetId}`, contentType: "image/gif", byteSize: gif.length, width: 2, height: 2, sha256: hash, fileName: "two-frame.gif", createdAt: "2026-08-30T00:00:00Z", purpose: "segment_fill" }] } };
    let requests = 0; const media = await embedCurrentWheelMedia(source, async () => { requests += 1; return new Response(gif, { headers: { "Content-Type": "image/gif" } }); }); assert.equal(requests, 1); assert.equal(media.segments.length, 1);
    const document = await createPortableWheel(source, { media }); const text = serializePortableWheel(document); assert.equal(text.includes(assetId), false); assert.equal(document.wheel.media.segments.length, 1);
    const parsed = await parseWheelImport(text); const proposal = parsed.proposals[0]; assert.match(proposal.config.paletteStyles[0].imageAssetId, /^[a-f0-9-]{16,80}$/i); assert.equal(proposal.entries[0].style.imageAssetId, proposal.config.paletteStyles[0].imageAssetId); assert.equal(proposal.media.segments[0].runtimeId, proposal.config.paletteStyles[0].imageAssetId);
  } finally { globalThis.window = priorWindow; }
});

test("generic JSON supports every documented narrow participant shape and preserves duplicates", async () => {
  const cases = [
    [["Alice", "Bob"], ["Alice", "Bob"]],
    [{ entries: ["Alice", "Bob"] }, ["Alice", "Bob"]],
    [{ participants: [{ label: "Alice", weight: 2, color: "#ffcc00", active: true }] }, ["Alice"]],
    [{ entries: [{ text: "Alice", enabled: false }, { name: "Alice", hidden: false }] }, ["Alice", "Alice"]],
  ];
  for (const [input, labels] of cases) { const parsed = await parseWheelImport(JSON.stringify(input), { sourceName: "people.json" }); assert.equal(parsed.detectedFormat, "generic-json"); assert.deepEqual(parsed.proposals[0].entries.map((entry) => entry.label), labels); }
  const weighted = await parseWheelImport(JSON.stringify(cases[2][0])); assert.equal(weighted.proposals[0].entries[0].weight, 2); assert.equal(weighted.proposals[0].entries[0].colour, "#FFCC00");
});
