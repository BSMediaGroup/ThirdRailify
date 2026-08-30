import assert from "node:assert/strict";
import test from "node:test";
import { createPortableStage, parsePortableStage, safeStageFilename, serializePortableStage } from "../src/wheels/stagePortable.mjs";
import { encodeBase64, sha256Hex, THIRD_RAIL_GOLD_CONFIG } from "../src/wheels/portable.mjs";

test(".tws is deterministic, integrity checked, authority-free, private by default, and round-trips one through six wheels", async () => {
  for (let count = 1; count <= 6; count += 1) {
    const document = await createPortableStage({ title: "Sanitized Stage", description: "Portable content", wheels: Array.from({ length: count }, (_, index) => ({ wheel: wheel(index) })) }, { exportedAt: "2026-08-30T00:00:00.000Z", generatorVersion: "test" });
    const text = serializePortableStage(document); assert.equal(text, serializePortableStage(document)); assert.doesNotMatch(text, /ownerAccount|officialResult|csrf|hmac|r2|grant|authoritativeSlug/i);
    const parsed = await parsePortableStage(text, { sourceName: "sanitized.tws", defaultConfig: THIRD_RAIL_GOLD_CONFIG }); assert.equal(parsed.proposals.length, count); assert.equal(parsed.visibility, "private"); assert.equal(parsed.integrityStatus, "verified");
  }
});

test(".tws deduplicates identical media across wheels and preserves logical segment references", async () => {
  const bytes = new TextEncoder().encode("GIF89a-sanitized"); const sha256 = await sha256Hex(bytes); const media = { background: null, center: { mode: "embedded", fileName: "shared.gif", mimeType: "image/gif", sha256, base64: encodeBase64(bytes) }, segments: [] };
  const document = await createPortableStage({ title: "Media Stage", wheels: [{ wheel: wheel(0), media }, { wheel: wheel(1), media }] }, { exportedAt: "2026-08-30T00:00:00.000Z" });
  assert.equal(document.media.assets.length, 1); const parsed = await parsePortableStage(serializePortableStage(document), { defaultConfig: THIRD_RAIL_GOLD_CONFIG }); assert.equal(parsed.mediaAssetCount, 1); assert.ok(parsed.proposals.every((item) => item.proposal.media.center.sha256 === sha256));
});

test(".tws rejects corruption, unknown authority-shaped fields, missing mappings, and more than six wheels", async () => {
  const document = await createPortableStage({ title: "Safe", wheels: [{ wheel: wheel(0) }] }, { exportedAt: "2026-08-30T00:00:00.000Z" });
  const corrupt = structuredClone(document); corrupt.stage.title = "Changed"; await assert.rejects(parsePortableStage(JSON.stringify(corrupt)), /integrity hash/);
  const authority = structuredClone(document); authority.stage.ownerAccountId = "forbidden"; await assert.rejects(parsePortableStage(JSON.stringify(authority)), /Unsupported Stage payload field/);
  const missing = structuredClone(document); missing.stage.slots[0].wheelKey = "wheel-6"; missing.integrity.stagePayload = await sha256Hex(JSON.stringify({})); await assert.rejects(parsePortableStage(JSON.stringify(missing)));
  await assert.rejects(createPortableStage({ title: "Seven", wheels: Array.from({ length: 7 }, (_, index) => ({ wheel: wheel(index) })) }), /one and six/);
  assert.equal(safeStageFilename("../../Unsafe Stage", "tws"), "Unsafe-Stage.tws");
});

function wheel(index) { return { title: `Wheel ${index + 1}`, description: "Sanitized", config: { ...THIRD_RAIL_GOLD_CONFIG, palette: [...THIRD_RAIL_GOLD_CONFIG.palette], paletteStyles: THIRD_RAIL_GOLD_CONFIG.paletteStyles.map((style) => ({ ...style })) }, entries: [{ id: crypto.randomUUID(), label: `Entrant ${index + 1}A`, order: 0, weight: 1, colour: "#F3C928", state: "active" }, { id: crypto.randomUUID(), label: `Entrant ${index + 1}B`, order: 1, weight: 2, colour: "#B8182F", state: "active" }] }; }
