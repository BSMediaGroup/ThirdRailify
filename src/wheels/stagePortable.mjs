/* eslint-disable no-control-regex */
/* global TextDecoder, TextEncoder, structuredClone */
import { canonicalStringify, createPortableWheel, decodeBase64, parseWheelImport, sha256Hex } from "./portable.mjs";

export const STAGE_FILE_FORMAT_ID = "thirdrailify-stage";
export const STAGE_FILE_FORMAT_VERSION = 1;
export const STAGE_FILE_MIME = "application/vnd.thirdrailify.stage+json";
export const STAGE_FILE_MAX_BYTES = 28 * 1024 * 1024;
export const STAGE_FILE_MEDIA_MAX_BYTES = 24 * 1024 * 1024;

export async function createPortableStage(input, options = {}) {
  if (!input || !Array.isArray(input.wheels) || input.wheels.length < 1 || input.wheels.length > 6) throw new Error("A portable Stage must contain between one and six wheels.");
  const title = bounded(input.title, 1, 100, "Stage title"); const description = bounded(input.description || "", 0, 280, "Stage description");
  const exportedAt = options.exportedAt || new Date().toISOString(); const assets = new Map(); const wheels = [];
  for (let index = 0; index < input.wheels.length; index += 1) {
    const source = input.wheels[index]; const key = `wheel-${index + 1}`;
    const portable = await createPortableWheel(source.wheel, { media: source.media, exportedAt, generatorVersion: options.generatorVersion });
    wheels.push({ key, portableWheel: compactMedia(portable.wheel, assets) });
  }
  const media = { assets: [...assets.values()].sort((a, b) => a.key.localeCompare(b.key)) };
  const mediaBytes = media.assets.reduce((sum, item) => sum + decodeBase64(item.base64).byteLength, 0);
  if (mediaBytes > STAGE_FILE_MEDIA_MAX_BYTES) throw new Error("Embedded Stage media exceeds the 24 MB deduplicated total limit.");
  const stage = { title, description, layout: { maxWheels: 6 }, slots: wheels.map((wheel, order) => ({ order, wheelKey: wheel.key })) };
  const payload = { stage, wheels, media }; const digest = await sha256Hex(canonicalStringify(payload));
  return { format: STAGE_FILE_FORMAT_ID, formatVersion: STAGE_FILE_FORMAT_VERSION, exportedAt, generator: { name: "Third Railify", version: String(options.generatorVersion || "unknown") }, ...payload, integrity: { algorithm: "SHA-256", stagePayload: digest } };
}

export function serializePortableStage(document) { return `${JSON.stringify(sortValue(document), null, 2)}\n`; }

export async function parsePortableStage(input, options = {}) {
  const text = decodeInput(input); const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > STAGE_FILE_MAX_BYTES) throw new Error("The Stage file exceeds the 28 MB limit.");
  let document; try { document = JSON.parse(text); } catch { throw new Error("The Stage file is not valid JSON."); }
  inspect(document); requireRecord(document, "Stage document"); rejectUnknown(document, new Set(["format", "formatVersion", "exportedAt", "generator", "stage", "wheels", "media", "integrity"]), "Stage document");
  if (document.format !== STAGE_FILE_FORMAT_ID) throw new Error("This is not a Third Railify Stage file.");
  if (document.formatVersion !== STAGE_FILE_FORMAT_VERSION) throw new Error(`Third Railify Stage format version ${document.formatVersion} is not supported.`);
  requireRecord(document.stage, "Stage payload"); rejectUnknown(document.stage, new Set(["title", "description", "layout", "slots"]), "Stage payload");
  const title = bounded(document.stage.title, 1, 100, "Stage title"); const description = bounded(document.stage.description || "", 0, 280, "Stage description");
  requireRecord(document.stage.layout, "Stage layout"); rejectUnknown(document.stage.layout, new Set(["maxWheels"]), "Stage layout"); if (document.stage.layout.maxWheels !== 6) throw new Error("The Stage layout maximum must be six.");
  if (!Array.isArray(document.stage.slots) || !Array.isArray(document.wheels) || document.stage.slots.length < 1 || document.stage.slots.length > 6 || document.wheels.length !== document.stage.slots.length) throw new Error("A Stage file must contain one to six aligned wheels and slots.");
  requireRecord(document.media, "Stage media"); rejectUnknown(document.media, new Set(["assets"]), "Stage media"); if (!Array.isArray(document.media.assets)) throw new Error("Stage media assets are invalid.");
  const assets = new Map(); let mediaBytes = 0;
  for (const item of document.media.assets) { requireRecord(item, "Stage media asset"); rejectUnknown(item, new Set(["key", "fileName", "mimeType", "sha256", "base64"]), "Stage media asset"); if (!/^asset-[a-f0-9]{20}$/.test(String(item.key || "")) || !/^[a-f0-9]{64}$/.test(String(item.sha256 || "")) || assets.has(item.key)) throw new Error("A Stage media asset reference is invalid or duplicated."); const assetBytes = decodeBase64(item.base64); mediaBytes += assetBytes.byteLength; if (await sha256Hex(assetBytes) !== item.sha256) throw new Error("A Stage media asset hash does not match."); assets.set(item.key, { ...item }); }
  if (mediaBytes > STAGE_FILE_MEDIA_MAX_BYTES) throw new Error("Embedded Stage media exceeds the 24 MB deduplicated total limit.");
  const payload = { stage: document.stage, wheels: document.wheels, media: document.media }; requireRecord(document.integrity, "Stage integrity"); rejectUnknown(document.integrity, new Set(["algorithm", "stagePayload"]), "Stage integrity");
  if (document.integrity.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(String(document.integrity.stagePayload || "")) || await sha256Hex(canonicalStringify(payload)) !== document.integrity.stagePayload) throw new Error("The Stage integrity hash does not match. The file may be corrupt or changed.");
  const wheelByKey = new Map();
  for (const item of document.wheels) { requireRecord(item, "Portable Stage wheel"); rejectUnknown(item, new Set(["key", "portableWheel"]), "Portable Stage wheel"); const key = String(item.key || ""); if (!/^wheel-[1-6]$/.test(key) || wheelByKey.has(key)) throw new Error("A portable Stage wheel key is invalid or duplicated."); wheelByKey.set(key, item.portableWheel); }
  const proposals = [];
  for (let index = 0; index < document.stage.slots.length; index += 1) {
    const slot = document.stage.slots[index]; requireRecord(slot, "Stage slot"); rejectUnknown(slot, new Set(["order", "wheelKey"]), "Stage slot"); if (slot.order !== index || !wheelByKey.has(slot.wheelKey)) throw new Error("Stage slots must be complete, unique, and ordered from zero.");
    const inflated = inflateMedia(wheelByKey.get(slot.wheelKey), assets);
    const parsed = await parseWheelImport(JSON.stringify({ format: "thirdrailify-wheel", formatVersion: 2, wheel: inflated }), { sourceName: `${options.sourceName || "Imported Stage"} / ${slot.wheelKey}`, defaultConfig: options.defaultConfig });
    proposals.push({ key: slot.wheelKey, proposal: parsed.proposals[0] });
  }
  if (new Set(document.stage.slots.map((slot) => slot.wheelKey)).size !== proposals.length) throw new Error("Stage wheel mappings must be one-to-one.");
  return { formatLabel: "Third Railify Stage", version: 1, sourceName: options.sourceName || "Imported Stage.tws", title, description, visibility: "private", integrityStatus: "verified", proposals, mediaAssetCount: assets.size, mediaBytes, mappings: proposals.map((item) => ({ wheelKey: item.key, mode: "create", existingSlug: "" })) };
}

export function safeStageFilename(value, extension = "tws") { const base = String(value || "stage").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-").replace(/[^a-zA-Z0-9._ -]+/g, "-").trim().replace(/[. ]+$/g, "").replace(/[\s_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "") || "stage"; return `${base}.${extension === "json" ? "json" : "tws"}`; }

function compactMedia(wheel, assets) {
  const copy = structuredClone(wheel); const convert = (item, logicalRef = "") => { if (!item) return null; const key = `asset-${item.sha256.slice(0, 20)}`; if (!assets.has(key)) assets.set(key, { key, fileName: item.fileName, mimeType: item.mimeType, sha256: item.sha256, base64: item.base64 }); return { mode: "reference", assetRef: key, ...(logicalRef ? { logicalRef } : {}) }; };
  copy.media = { background: convert(copy.media?.background), center: convert(copy.media?.center), segments: (copy.media?.segments || []).map((item) => convert(item, item.assetRef)) }; return copy;
}
function inflateMedia(wheel, assets) {
  requireRecord(wheel, "Portable Wheel"); const copy = structuredClone(wheel); requireRecord(copy.media, "Portable Wheel media"); rejectUnknown(copy.media, new Set(["background", "center", "segments"]), "Portable Wheel media");
  const inflate = (reference, segment = false) => { if (reference == null) return null; requireRecord(reference, "Stage media reference"); rejectUnknown(reference, new Set(["mode", "assetRef", ...(segment ? ["logicalRef"] : [])]), "Stage media reference"); if (reference.mode !== "reference" || !assets.has(reference.assetRef)) throw new Error("A Stage wheel references missing media."); const asset = assets.get(reference.assetRef); return { mode: "embedded", fileName: asset.fileName, mimeType: asset.mimeType, sha256: asset.sha256, base64: asset.base64, ...(segment ? { assetRef: String(reference.logicalRef || "") } : {}) }; };
  copy.media = { background: inflate(copy.media.background), center: inflate(copy.media.center), segments: Array.isArray(copy.media.segments) ? copy.media.segments.map((item) => inflate(item, true)) : [] }; return copy;
}
function decodeInput(input) { if (typeof input === "string") return input.replace(/^\uFEFF/, ""); const bytes = input instanceof Uint8Array ? input : new Uint8Array(input); try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""); } catch { throw new Error("The Stage file is not valid UTF-8."); } }
function bounded(value, min, max, label) { const clean = String(value ?? "").replace(/[\t\n\r]+/g, " ").replace(/\s+/g, " ").trim(); if (clean.length < min || clean.length > max) throw new Error(`${label} must contain ${min ? `between ${min} and ${max}` : `no more than ${max}`} characters.`); return clean; }
function requireRecord(value, label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`); }
function rejectUnknown(value, allowed, label) { for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`Unsupported ${label} field ${JSON.stringify(key)}.`); }
function inspect(root) { let keys = 0; const visit = (value, depth) => { if (depth > 40) throw new Error("The Stage JSON is nested too deeply."); if (Array.isArray(value)) { if (value.length > 7000) throw new Error("A Stage JSON array is too large."); value.forEach((item) => visit(item, depth + 1)); return; } if (!value || typeof value !== "object") return; for (const [key, item] of Object.entries(value)) { if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("The Stage JSON contains an unsafe key."); if (++keys > 70000) throw new Error("The Stage JSON contains too many keys."); visit(item, depth + 1); } }; visit(root, 0); }
function sortValue(value) { if (Array.isArray(value)) return value.map(sortValue); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])); }
