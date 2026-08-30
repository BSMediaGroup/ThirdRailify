/* eslint-disable no-control-regex */
import { convertWheelOfNames } from "./wheelOfNames.mjs";
import { normalizeImportedPalette, normalizeImportedSegmentStyle } from "./paletteNormalization.mjs";
import { normalizePaletteStyles, normalizeSegmentStyle, normalizeSpinSoundPreset, normalizeWinnerSoundPreset } from "./segmentStyles.mjs";

export const WHEEL_FILE_FORMAT_ID = "thirdrailify-wheel";
export const WHEEL_FILE_FORMAT_VERSION = 2;
export const WHEEL_FILE_MIME = "application/vnd.thirdrailify.wheel+json";
export const WHEEL_JSON_MIME = "application/json";
export const WHEEL_IMPORT_ACCEPT = ".twl,.json,.wheel,application/json,application/vnd.thirdrailify.wheel+json";
export const WHEEL_FILE_LIMITS = Object.freeze({ fileBytes: 18 * 1024 * 1024, textCharacters: 18 * 1024 * 1024, depth: 32, objectKeys: 20_000, arrayItems: 2_000, wheelConfigs: 20, entries: 1_000, entryLabel: 120, title: 100, description: 280, palette: 12, weight: 100_000, winnerMessage: 160, backgroundBytes: 8 * 1024 * 1024, centerBytes: 4 * 1024 * 1024, segmentBytes: 2 * 1024 * 1024, segmentAssets: 20, embeddedMediaBytes: 12 * 1024 * 1024 });
export const THIRD_RAIL_GOLD_CONFIG = Object.freeze({ themePreset: "third-rail-gold", palette: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"], paletteStyles: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"].map((color) => ({ mode: "solid", color })), pointerAccent: "#F3C928", centreTreatment: "bolt", backgroundIntensity: "high", labelContrast: "light", spinDurationMs: 6500, tickingSoundEnabled: true, spinSoundPreset: "classic-tick", winnerSoundEnabled: true, winnerSoundPreset: "gold-rise", celebrationEnabled: true, confettiEnabled: true, fireworksEnabled: true, winnerLightingEnabled: true, celebrationIntensity: "normal", backgroundEnabled: true, backgroundFocalX: 50, backgroundFocalY: 50, backgroundImageOpacity: 72, backgroundOverlayIntensity: 58, winnerMessageTemplate: "Signal locked: {winner}", publicHistoryVisible: true });

const HEX = /^#[0-9a-f]{6}$/i;
const SETTINGS = Object.freeze(Object.keys(THIRD_RAIL_GOLD_CONFIG));
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MEDIA_TYPES = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"], ["image/bmp", "bmp"], ["image/gif", "gif"], ["image/svg+xml", "svg"]]);

export async function createPortableWheel(input, options = {}) {
  const media = options.media || { background: null, center: null, segments: [] }; const refs = new Map((media.segments || []).map((item) => [item.sourceAssetId, item.assetRef]));
  const sourceStyles = Array.isArray(input.config.paletteStyles) && input.config.paletteStyles.length === input.config.palette.length ? input.config.paletteStyles : undefined;
  const settings = { ...input.config, paletteStyles: normalizePaletteStyles(sourceStyles, input.config.palette).map((style) => portableStyle(style, refs)) };
  const portableMedia = { background: media.background, center: media.center, segments: (media.segments || []).map((item) => { const portable = { ...item }; delete portable.sourceAssetId; delete portable.runtimeId; return portable; }) };
  const wheel = normalizePortableWheel({ title: input.title, description: input.description || "", settings, entries: input.entries.map((entry) => ({ label: entry.label, weight: entry.weight, color: entry.colour, style: entry.style ? portableStyle(entry.style, refs) : null, active: entry.state !== "hidden", order: entry.order })), media: portableMedia });
  const digest = await sha256Hex(canonicalStringify(wheel));
  return { format: WHEEL_FILE_FORMAT_ID, formatVersion: WHEEL_FILE_FORMAT_VERSION, exportedAt: options.exportedAt || new Date().toISOString(), generator: { name: "Third Railify", version: String(options.generatorVersion || "unknown") }, source: { slug: safeSourceSlug(options.sourceSlug) }, wheel, integrity: { algorithm: "SHA-256", wheelPayload: digest } };
}

export function serializePortableWheel(document) { return `${JSON.stringify(canonicalOrderDocument(document), null, 2)}\n`; }
export function canonicalStringify(value) { return JSON.stringify(sortValue(value)); }

export async function parseWheelImport(input, options = {}) {
  const sourceName = safeDisplayName(options.sourceName || "Pasted JSON");
  const text = decodeInput(input);
  if (text.length > WHEEL_FILE_LIMITS.textCharacters || new globalThis.TextEncoder().encode(text).byteLength > WHEEL_FILE_LIMITS.fileBytes) throw new Error("The wheel file exceeds the 18 MB portable-file limit.");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("The file is not valid JSON."); }
  inspectStructure(parsed);
  const defaults = normalizeSettings(options.defaultConfig || THIRD_RAIL_GOLD_CONFIG);
  if (isRecord(parsed) && parsed.format === WHEEL_FILE_FORMAT_ID) return parseCanonical(parsed, sourceName, defaults);
  if (isRecord(parsed) && Array.isArray(parsed.wheelConfigs)) {
    const proposals = convertWheelOfNames(parsed, converterOptions(defaults, sourceName));
    for (const proposal of proposals) await fillMediaHashes(proposal.media);
    return { detectedFormat: "wheel-of-names", formatLabel: "Wheel of Names", version: null, sourceName, topLevelTitle: cleanOptionalTitle(parsed.title), configCount: parsed.wheelConfigs.length, proposals: proposals.map((proposal) => finalizeProposal(proposal, "absent")) };
  }
  return { detectedFormat: "generic-json", formatLabel: "Generic participant JSON", version: null, sourceName, proposals: [finalizeProposal(convertGeneric(parsed, defaults, sourceName), "absent")] };
}

async function parseCanonical(document, sourceName, defaults) {
  if (!Number.isInteger(document.formatVersion)) throw new Error("The Third Railify format version is malformed.");
  if (![1, WHEEL_FILE_FORMAT_VERSION].includes(document.formatVersion)) throw new Error(`Third Railify wheel format version ${document.formatVersion} is not supported.`);
  rejectUnknown(document, new Set(["format", "formatVersion", "exportedAt", "generator", "source", "wheel", "integrity"]), "document");
  if (!isRecord(document.wheel)) throw new Error("The Third Railify wheel payload is missing.");
  const wheel = normalizePortableWheel(document.wheel, defaults);
  for (const [purpose, items] of Object.entries(wheel.media)) for (const item of (purpose === "segments" ? items : [items])) if (item) { const actualMediaHash = await sha256Hex(decodeBase64(item.base64)); if (actualMediaHash !== item.sha256) throw new Error(`The embedded ${purpose} image hash does not match.`); }
  let integrityStatus = "absent";
  if (document.integrity != null) {
    if (!isRecord(document.integrity) || document.integrity.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(String(document.integrity.wheelPayload || ""))) throw new Error("The wheel integrity metadata is invalid.");
    const actual = await sha256Hex(canonicalStringify(document.wheel));
    if (actual !== document.integrity.wheelPayload) throw new Error("The wheel integrity hash does not match. The file may be corrupt or changed.");
    integrityStatus = "verified";
  }
  const runtimeRefs = new Map(wheel.media.segments.map((item) => [item.assetRef, newId()])); const media = { ...wheel.media, segments: wheel.media.segments.map((item) => ({ ...item, runtimeId: runtimeRefs.get(item.assetRef) })) };
  const config = { ...wheel.settings, paletteStyles: wheel.settings.paletteStyles.map((style) => runtimeStyle(style, runtimeRefs)) };
  const proposal = { title: wheel.title, description: wheel.description, config, entries: wheel.entries.map((entry) => ({ id: newId(), label: entry.label, order: entry.order, weight: entry.weight, colour: entry.color, style: entry.style ? runtimeStyle(entry.style, runtimeRefs) : null, state: entry.active ? "active" : "hidden" })), media, messages: [info("integrity", integrityStatus === "verified" ? "verified" : "absent", integrityStatus === "verified" ? "SHA-256 matched the canonical wheel payload. This detects corruption; it is not a signature." : "This supported file has no integrity hash."), info("entry identity", "fresh local IDs", "Portable entries never control authoritative entry identity."), info("official history and access", "never imported", "Portable files contain creator-editable content only."), ...paletteMessages(wheel._paletteWarnings)], sourceIndex: 0 };
  return { detectedFormat: "thirdrailify", formatLabel: "Third Railify wheel", version: document.formatVersion, sourceName, proposals: [finalizeProposal(proposal, integrityStatus)] };
}

function normalizePortableWheel(value, defaults = THIRD_RAIL_GOLD_CONFIG) {
  if (!isRecord(value)) throw new Error("The wheel payload is invalid.");
  rejectUnknown(value, new Set(["title", "description", "settings", "entries", "media"]), "wheel");
  const title = boundedText(value.title, 1, WHEEL_FILE_LIMITS.title, "Wheel title");
  const description = boundedText(value.description || "", 0, WHEEL_FILE_LIMITS.description, "Wheel description");
  const mediaValue = value.media == null ? {} : value.media;
  if (!isRecord(mediaValue)) throw new Error("Portable media metadata is invalid.");
  rejectUnknown(mediaValue, new Set(["background", "center", "segments"]), "wheel.media");
  const segments = mediaValue.segments == null ? [] : mediaValue.segments;
  if (!Array.isArray(segments) || segments.length > WHEEL_FILE_LIMITS.segmentAssets) throw new Error("Portable segment media exceeds the 20-asset limit.");
  const media = { background: normalizeEmbeddedMedia(mediaValue.background, "background"), center: normalizeEmbeddedMedia(mediaValue.center, "center"), segments: segments.map((item, index) => normalizeSegmentMedia(item, index)) };
  if (new Set(media.segments.map((item) => item.assetRef)).size !== media.segments.length) throw new Error("Portable segment media references must be unique.");
  const totalMedia = [media.background, media.center, ...media.segments].reduce((total, item) => total + (item ? decodeBase64(item.base64).byteLength : 0), 0);
  if (totalMedia > WHEEL_FILE_LIMITS.embeddedMediaBytes) throw new Error("Embedded wheel media exceeds the 12 MB total limit.");
  const availableImageAssetRefs = new Set(media.segments.map((item) => item.assetRef));
  const settings = normalizeSettings(value.settings || defaults, availableImageAssetRefs);
  if (!Array.isArray(value.entries) || !value.entries.length) throw new Error("The wheel must contain at least one entry.");
  if (value.entries.length > WHEEL_FILE_LIMITS.entries) throw new Error(`The wheel exceeds the ${WHEEL_FILE_LIMITS.entries}-entry limit.`);
  const entryWarnings = [];
  const entries = value.entries.map((entry, index) => normalizePortableEntry(entry, index, availableImageAssetRefs, entryWarnings)).sort((a, b) => a.order - b.order || a._sourceOrder - b._sourceOrder).map((entry, order) => ({ label: entry.label, weight: entry.weight, color: entry.color, style: entry.style, active: entry.active, order }));
  const result = { title, description, settings, entries, media };
  Object.defineProperty(result, "_paletteWarnings", { value: [...settings._paletteWarnings, ...entryWarnings], enumerable: false });
  return result;
}

function normalizePortableEntry(entry, index, availableImageAssetRefs, warnings) {
  if (!isRecord(entry)) throw new Error(`Entry ${index + 1} is invalid.`);
  rejectUnknown(entry, new Set(["label", "weight", "color", "style", "active", "order"]), `entry ${index + 1}`);
  const weight = finiteInteger(entry.weight ?? 1, 1, WHEEL_FILE_LIMITS.weight, `Entry ${index + 1} weight`);
  const order = finiteInteger(entry.order ?? index, 0, WHEEL_FILE_LIMITS.entries - 1, `Entry ${index + 1} order`);
  const color = entry.color == null || entry.color === "" ? null : normalizeHex(entry.color, `Entry ${index + 1} colour`);
  const normalized = entry.style == null ? null : normalizeImportedSegmentStyle(entry.style, color || "#F3C928", { availableImageAssetRefs });
  const style = normalized?.style || null;
  if (normalized?.repair) warnings.push({ code: `entry-${normalized.repair}-fallback`, severity: "warning", reason: normalized.repair === "image" ? `Entry ${index + 1} segment image could not be imported; its fallback colour will be used.` : `Entry ${index + 1} segment style was replaced with its fallback colour.` });
  return { label: boundedText(entry.label, 1, WHEEL_FILE_LIMITS.entryLabel, `Entry ${index + 1} label`), weight, color: style?.color || color, style, active: entry.active !== false, order, _sourceOrder: index };
}

function normalizeSettings(value, availableImageAssetRefs) {
  if (!isRecord(value)) throw new Error("Wheel settings are invalid.");
  rejectUnknown(value, new Set(SETTINGS), "wheel.settings");
  let preset = new Set(["third-rail-gold", "live-wire-red", "gina-violet", "high-voltage-mono", "signal-teal", "after-hours", "high-voltage-hazard", "rail-strike", "goated-circuit", "night-signal", "custom"]).has(value.themePreset) ? value.themePreset : "third-rail-gold";
  const normalized = normalizeImportedPalette(value.palette, value.paletteStyles, { defaultPalette: THIRD_RAIL_GOLD_CONFIG.palette, maxPalette: preset === "custom" ? 5 : WHEEL_FILE_LIMITS.palette, availableImageAssetRefs });
  if (normalized.palette.length === 1) preset = "custom";
  const result = { themePreset: preset, palette: normalized.palette, paletteStyles: normalized.paletteStyles, pointerAccent: normalizeHex(value.pointerAccent || THIRD_RAIL_GOLD_CONFIG.pointerAccent, "Pointer accent"), centreTreatment: oneOf(value.centreTreatment, ["bolt", "signal", "ring"], "bolt"), backgroundIntensity: oneOf(value.backgroundIntensity, ["low", "medium", "high"], "high"), labelContrast: oneOf(value.labelContrast, ["light", "dark"], "light"), spinDurationMs: finiteInteger(value.spinDurationMs ?? 6500, 2000, 60000, "Spin duration"), tickingSoundEnabled: value.tickingSoundEnabled !== false, spinSoundPreset: normalizeSpinSoundPreset(value.spinSoundPreset), winnerSoundEnabled: value.winnerSoundEnabled !== false, winnerSoundPreset: normalizeWinnerSoundPreset(value.winnerSoundPreset), celebrationEnabled: value.celebrationEnabled !== false, confettiEnabled: value.confettiEnabled !== false, fireworksEnabled: value.fireworksEnabled !== false, winnerLightingEnabled: value.winnerLightingEnabled !== false, celebrationIntensity: oneOf(value.celebrationIntensity, ["subtle", "normal", "strong"], "normal"), backgroundEnabled: value.backgroundEnabled !== false, backgroundFocalX: finiteInteger(value.backgroundFocalX ?? 50, 0, 100, "Background focal X"), backgroundFocalY: finiteInteger(value.backgroundFocalY ?? 50, 0, 100, "Background focal Y"), backgroundImageOpacity: finiteInteger(value.backgroundImageOpacity ?? 72, 0, 100, "Background opacity"), backgroundOverlayIntensity: finiteInteger(value.backgroundOverlayIntensity ?? 58, 0, 100, "Background overlay"), winnerMessageTemplate: boundedText(value.winnerMessageTemplate || THIRD_RAIL_GOLD_CONFIG.winnerMessageTemplate, 1, WHEEL_FILE_LIMITS.winnerMessage, "Winner message"), publicHistoryVisible: value.publicHistoryVisible !== false };
  Object.defineProperty(result, "_paletteWarnings", { value: normalized.warnings, enumerable: false });
  return result;
}

function convertGeneric(document, defaults, sourceName) {
  let rows; let title = sourceTitle(sourceName); const messages = [];
  if (Array.isArray(document)) rows = document;
  else if (isRecord(document) && Array.isArray(document.participants)) { rows = document.participants; title = cleanOptionalTitle(document.title) || title; }
  else if (isRecord(document) && Array.isArray(document.entries)) { rows = document.entries; title = cleanOptionalTitle(document.title) || title; }
  else throw new Error("Unsupported JSON structure. Use a participant array, an entries array, or a participants array.");
  if (!rows.length) throw new Error("The participant list is empty.");
  if (rows.length > WHEEL_FILE_LIMITS.entries) throw new Error(`The participant list exceeds the ${WHEEL_FILE_LIMITS.entries}-entry limit.`);
  const entries = rows.map((row, index) => genericEntry(row, index, messages));
  if (isRecord(document)) { const supported = new Set(["title", "description", "entries", "participants"]); const ignored = Object.keys(document).filter((key) => !supported.has(key)); if (ignored.length) messages.push(warning("top-level fields", "unsupported fields ignored", ignored.join(", "))); }
  messages.push(info("settings", "current defaults retained", "Generic JSON imports participants only."));
  messages.push(info("access, results, locks, media URLs and scripts", "never imported", "Generic JSON cannot control authoritative state."));
  return { title, description: isRecord(document) ? boundedText(document.description || "", 0, WHEEL_FILE_LIMITS.description, "Description") : "", config: { ...defaults, palette: [...defaults.palette] }, entries, media: { background: null, center: null, segments: [] }, messages, sourceIndex: 0 };
}

function genericEntry(row, index, messages) {
  if (typeof row === "string") return { id: newId(), label: boundedText(row, 1, WHEEL_FILE_LIMITS.entryLabel, `Entry ${index + 1} label`), order: index, weight: 1, colour: null, state: "active" };
  if (!isRecord(row)) throw new Error(`Entry ${index + 1} is invalid.`);
  const labels = ["label", "text", "name"].filter((key) => row[key] != null && String(row[key]).trim());
  if (!labels.length) throw new Error(`Entry ${index + 1} has no label, text, or name.`);
  if (labels.length > 1) messages.push(warning(`entry ${index + 1}`, "label priority", `Conflicting label fields were present; ${labels[0]} was used.`));
  const flags = ["active", "enabled", "hidden"].filter((key) => typeof row[key] === "boolean");
  if (flags.length > 1) messages.push(warning(`entry ${index + 1}`, "active priority", "Conflicting state fields were present; active, then enabled, then hidden priority was used."));
  const active = typeof row.active === "boolean" ? row.active : typeof row.enabled === "boolean" ? row.enabled : typeof row.hidden === "boolean" ? !row.hidden : true;
  const weight = row.weight == null ? 1 : finiteInteger(row.weight, 1, WHEEL_FILE_LIMITS.weight, `Entry ${index + 1} weight`);
  const colourValue = row.color ?? row.colour;
  const colour = colourValue == null || colourValue === "" ? null : normalizeHex(colourValue, `Entry ${index + 1} colour`);
  const supported = new Set(["label", "text", "name", "weight", "color", "colour", "active", "enabled", "hidden", "order"]); const ignored = Object.keys(row).filter((key) => !supported.has(key)); if (ignored.length) messages.push(warning(`entry ${index + 1}`, "unsupported fields ignored", ignored.join(", ")));
  return { id: newId(), label: boundedText(row[labels[0]], 1, WHEEL_FILE_LIMITS.entryLabel, `Entry ${index + 1} label`), order: index, weight, colour, state: active ? "active" : "hidden" };
}

export async function embedCurrentWheelMedia(wheel, fetchImpl = globalThis.fetch) {
  const result = { background: null, center: null, segments: [] };
  for (const [portablePurpose, runtimePurpose] of [["background", "background"], ["center", "centre"]]) {
    const asset = wheel.media?.[runtimePurpose]; if (!asset) continue;
    const url = new globalThis.URL(asset.url, globalThis.window.location.origin);
    if (!authorizedWheelMediaUrl(url)) throw new Error(`The ${portablePurpose} image is not available through an authorized same-origin or public CDN wheel route.`);
    const response = await fetchImpl(url.origin === globalThis.window.location.origin ? url.pathname : url.href, { credentials: url.origin === globalThis.window.location.origin ? "include" : "omit", cache: "no-store", headers: { Accept: "image/*" } });
    if (!response.ok) throw new Error(`The ${portablePurpose} image could not be included.`);
    const bytes = new Uint8Array(await response.arrayBuffer()); const mimeType = normalizeMediaType(response.headers.get("content-type") || asset.contentType);
    validateMedia(bytes, mimeType, portablePurpose);
    const sha256 = await sha256Hex(bytes); if (asset.sha256 && sha256 !== String(asset.sha256).toLowerCase()) throw new Error(`The ${portablePurpose} image hash did not match its authoritative projection.`);
    result[portablePurpose] = { mode: "embedded", fileName: safeMediaName("", portablePurpose, mimeType), mimeType, sha256, base64: encodeBase64(bytes) };
  }
  const referenced = new Set(); if (wheel.config?.palette && wheel.entries) for (const style of [...normalizePaletteStyles(wheel.config.paletteStyles, wheel.config.palette), ...wheel.entries.map((entry) => entry.style).filter(Boolean)]) if (style.mode === "image") referenced.add(style.imageAssetId);
  for (const asset of wheel.media?.segmentFills || []) {
    if (!referenced.has(asset.id)) continue;
    const url = new globalThis.URL(asset.url, globalThis.window.location.origin); if (!authorizedWheelMediaUrl(url)) throw new Error("A segment image is not available through an authorized same-origin or public CDN wheel route.");
    const response = await fetchImpl(url.origin === globalThis.window.location.origin ? url.pathname : url.href, { credentials: url.origin === globalThis.window.location.origin ? "include" : "omit", cache: "no-store", headers: { Accept: "image/*" } }); if (!response.ok) throw new Error("A referenced segment image could not be included.");
    const bytes = new Uint8Array(await response.arrayBuffer()); const mimeType = normalizeMediaType(response.headers.get("content-type") || asset.contentType); validateMedia(bytes, mimeType, "segment"); const sha256 = await sha256Hex(bytes); if (asset.sha256 && sha256 !== String(asset.sha256).toLowerCase()) throw new Error("A segment image hash did not match its authoritative projection.");
    const existing = result.segments.find((item) => item.sha256 === sha256); if (existing) { result.segments.push({ ...existing, sourceAssetId: asset.id }); continue; }
    result.segments.push({ mode: "embedded", assetRef: `segment-${sha256.slice(0, 20)}`, sourceAssetId: asset.id, fileName: safeMediaName(asset.fileName || "segment-fill", "segment", mimeType), mimeType, sha256, base64: encodeBase64(bytes) });
  }
  const total = [result.background, result.center, ...result.segments.filter((item, index, items) => items.findIndex((candidate) => candidate.sha256 === item.sha256) === index)].reduce((sum, item) => sum + (item ? decodeBase64(item.base64).byteLength : 0), 0);
  if (total > WHEEL_FILE_LIMITS.embeddedMediaBytes) throw new Error("Embedded wheel media exceeds the 12 MB total limit.");
  return result;
}

function authorizedWheelMediaUrl(url) { return (url.origin === globalThis.window.location.origin && /^\/api\/wheels\/media\/[a-f0-9-]{16,80}$/i.test(url.pathname)) || (url.origin === "https://cdn.thirdrailify.com" && /^\/wheel-media\/[a-f0-9-]{16,80}$/i.test(url.pathname)); }

export function embeddedMediaBlob(item) { if (!item) return null; const bytes = decodeBase64(item.base64); return new globalThis.File([bytes], item.fileName, { type: item.mimeType }); }
export function safeWheelFilename(value, extension = "twl") { const base = String(value || "wheel").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-").replace(/[^a-zA-Z0-9._ -]+/g, "-").trim().replace(/[. ]+$/g, "").replace(/[\s_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "") || "wheel"; const ext = extension === "json" ? "json" : "twl"; return `${base}.${ext}`; }
export function downloadPortableText(text, fileName, mimeType) { const blob = new globalThis.Blob([text], { type: `${mimeType};charset=utf-8` }); const url = globalThis.URL.createObjectURL(blob); const anchor = globalThis.document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.hidden = true; globalThis.document.body.append(anchor); anchor.click(); anchor.remove(); globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 0); }
export async function copyPortableText(text) { if (globalThis.navigator.clipboard?.writeText) { await globalThis.navigator.clipboard.writeText(text); return; } const area = globalThis.document.createElement("textarea"); area.value = text; area.readOnly = true; area.style.position = "fixed"; area.style.opacity = "0"; globalThis.document.body.append(area); area.select(); const copied = globalThis.document.execCommand("copy"); area.remove(); if (!copied) throw new Error("Clipboard access is unavailable."); }

function normalizeEmbeddedMedia(value, purpose) {
  if (value == null) return null;
  if (!isRecord(value)) throw new Error(`Embedded ${purpose} media is invalid.`);
  rejectUnknown(value, new Set(["mode", "fileName", "mimeType", "sha256", "base64", ...(purpose === "segment" ? ["assetRef"] : [])]), `${purpose} media`);
  if (value.mode !== "embedded") throw new Error(`Embedded ${purpose} media mode is invalid.`);
  const mimeType = normalizeMediaType(value.mimeType); const base64 = String(value.base64 || ""); const bytes = decodeBase64(base64); validateMedia(bytes, mimeType, purpose);
  if (!/^[a-f0-9]{64}$/.test(String(value.sha256 || ""))) throw new Error(`Embedded ${purpose} media hash is invalid.`);
  return { mode: "embedded", fileName: safeMediaName(value.fileName, purpose, mimeType), mimeType, sha256: String(value.sha256), base64: encodeBase64(bytes) };
}

function normalizeSegmentMedia(value, index) { if (!isRecord(value)) throw new Error(`Embedded segment media ${index + 1} is invalid.`); rejectUnknown(value, new Set(["mode", "assetRef", "fileName", "mimeType", "sha256", "base64"]), `segment media ${index + 1}`); const item = normalizeEmbeddedMedia(value, "segment"); const assetRef = String(value.assetRef || ""); if (!/^segment-[a-f0-9]{12,64}$/.test(assetRef)) throw new Error("Embedded segment media has an invalid logical reference."); return { ...item, assetRef }; }

function portableStyle(value, refs) { const style = normalizeSegmentStyle(value); if (style.mode !== "image") return style; const imageAssetRef = refs.get(style.imageAssetId); if (!imageAssetRef) return { mode: "solid", color: style.color }; return { mode: "image", color: style.color, imageAssetRef }; }
function runtimeStyle(value, refs) { if (value.mode !== "image") return value; const imageAssetId = refs.get(value.imageAssetRef); return imageAssetId ? { mode: "image", color: value.color, imageAssetId } : { mode: "solid", color: value.color }; }

async function fillMediaHashes(media) { for (const value of Object.values(media)) for (const item of Array.isArray(value) ? value : [value]) if (item && !item.sha256) item.sha256 = await sha256Hex(decodeBase64(item.base64)); }
function finalizeProposal(proposal, integrityStatus) { const availableImageAssetIds = new Set((proposal.media.segments || []).map((item) => item.runtimeId).filter(Boolean)); const normalized = normalizeImportedPalette(proposal.config.palette, proposal.config.paletteStyles, { defaultPalette: THIRD_RAIL_GOLD_CONFIG.palette, maxPalette: proposal.config.themePreset === "custom" ? 5 : WHEEL_FILE_LIMITS.palette, availableImageAssetIds }); const config = { ...proposal.config, themePreset: normalized.palette.length === 1 ? "custom" : proposal.config.themePreset, palette: normalized.palette, paletteStyles: normalized.paletteStyles }; const active = proposal.entries.filter((entry) => entry.state === "active").length; const labels = new Map(); for (const entry of proposal.entries) labels.set(entry.label.toLocaleLowerCase(), (labels.get(entry.label.toLocaleLowerCase()) || 0) + 1); return { ...proposal, config, messages: [...proposal.messages, ...paletteMessages(normalized.warnings)], integrityStatus, summary: { participantCount: proposal.entries.length, activeCount: active, hiddenCount: proposal.entries.length - active, duplicateLabelCount: [...labels.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0), weightedEntryCount: proposal.entries.filter((entry) => entry.weight !== 1).length, totalWeight: proposal.entries.reduce((sum, entry) => sum + entry.weight, 0), colourCount: new Set(proposal.entries.map((entry) => entry.colour).filter(Boolean)).size, mediaDetected: Boolean(proposal.media.background || proposal.media.center || proposal.media.segments?.length) } }; }
function paletteMessages(warnings = []) { const seen = new Set(); return warnings.filter((item) => { if (seen.has(item.code)) return false; seen.add(item.code); return true; }).map((item) => ({ severity: item.severity, sourceField: "palette / paletteStyles", target: "canonical palette", reason: item.reason })); }
function converterOptions(defaultConfig, sourceName) { return { defaultConfig, sourceTitle: sourceTitle(sourceName), maxWheelConfigs: WHEEL_FILE_LIMITS.wheelConfigs, maxEntries: WHEEL_FILE_LIMITS.entries, maxEntryLabel: WHEEL_FILE_LIMITS.entryLabel, maxTitle: WHEEL_FILE_LIMITS.title, maxDescription: WHEEL_FILE_LIMITS.description, maxPalette: WHEEL_FILE_LIMITS.palette, maxWeight: WHEEL_FILE_LIMITS.weight, maxWinnerMessage: WHEEL_FILE_LIMITS.winnerMessage, minSpinDurationMs: 2000, maxSpinDurationMs: 60000, newId, normalizeMediaType, decodeBase64, encodeBase64, validateMedia, safeMediaName }; }
function inspectStructure(root) { let keys = 0; const visit = (value, depth) => { if (depth > WHEEL_FILE_LIMITS.depth) throw new Error("The JSON is nested too deeply."); if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite numbers are not supported."); if (Array.isArray(value)) { if (value.length > WHEEL_FILE_LIMITS.arrayItems) throw new Error("A JSON array exceeds the supported size."); for (const item of value) visit(item, depth + 1); return; } if (!isRecord(value)) return; for (const [key, item] of Object.entries(value)) { if (DANGEROUS_KEYS.has(key)) throw new Error(`Unsafe JSON key ${JSON.stringify(key)} is not allowed.`); keys += 1; if (keys > WHEEL_FILE_LIMITS.objectKeys) throw new Error("The JSON contains too many object keys."); visit(item, depth + 1); } }; visit(root, 0); }
function decodeInput(input) { if (typeof input === "string") return input; const bytes = input instanceof Uint8Array ? input : new Uint8Array(input); if (bytes.byteLength > WHEEL_FILE_LIMITS.fileBytes) throw new Error("The wheel file exceeds the 18 MB portable-file limit."); try { return new globalThis.TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""); } catch { throw new Error("The wheel file is not valid UTF-8."); } }
function validateMedia(bytes, mimeType, purpose) { const limit = purpose === "background" ? WHEEL_FILE_LIMITS.backgroundBytes : purpose === "segment" ? WHEEL_FILE_LIMITS.segmentBytes : WHEEL_FILE_LIMITS.centerBytes; if (!bytes.byteLength || bytes.byteLength > limit) throw new Error(`Embedded ${purpose} media must be between 1 byte and ${limit / 1024 / 1024} MB.`); const detected = detectMediaType(bytes); if (!detected || detected !== mimeType) throw new Error(`Embedded ${purpose} media is not a valid ${mimeType} image.`); if (mimeType === "image/svg+xml") validateSvg(bytes); }
function detectMediaType(bytes) { if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"; if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value)) return "image/png"; if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp"; if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "image/bmp"; if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) return "image/gif"; try { if (/^<svg[\s>]/i.test(new globalThis.TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, 512)).replace(/^\uFEFF/, "").trimStart())) return "image/svg+xml"; } catch { return ""; } return ""; }
function validateSvg(bytes) { if (bytes.byteLength > 512 * 1024) throw new Error("Embedded SVG media is too complex."); let source; try { source = new globalThis.TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); } catch { throw new Error("Embedded SVG is not valid UTF-8."); } if (!/^<svg[\s>]/i.test(source) || !/<\/svg>\s*$/i.test(source) || (source.match(/</g) || []).length > 4000 || /<\s*(?:script|foreignObject|iframe|object|embed|audio|video|canvas|link|meta)\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)|url\s*\(\s*["']?\s*(?:https?:|\/\/|data:)|<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source)) throw new Error("Embedded SVG contains executable, external, or unsafe content."); }
function normalizeMediaType(value) { const type = String(value || "").split(";", 1)[0].trim().toLowerCase(); const normalized = type === "image/jpg" || type === "image/pjpeg" ? "image/jpeg" : type === "image/x-ms-bmp" ? "image/bmp" : type; if (!MEDIA_TYPES.has(normalized)) throw new Error("Only PNG, JPEG, WebP, BMP, GIF, or screened SVG media is supported."); return normalized; }
function safeMediaName(value, purpose, mimeType) { const base = String(value || purpose).replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-").replace(/[^a-zA-Z0-9._ -]+/g, "-").trim().replace(/[. ]+$/g, "").replace(/[\s_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "") || purpose; return `${base}.${MEDIA_TYPES.get(mimeType)}`; }
function encodeBase64(bytes) { let output = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) output += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return globalThis.btoa(output); }
function decodeBase64(value) { const source = String(value || ""); if (!source || source.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(source)) throw new Error("Embedded media base64 is invalid."); let binary; try { binary = globalThis.atob(source); } catch { throw new Error("Embedded media base64 is invalid."); } const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
async function sha256Hex(value) { const bytes = typeof value === "string" ? new globalThis.TextEncoder().encode(value) : value; const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)); return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function canonicalOrderDocument(document) { return sortValue(document); }
function sortValue(value) { if (Array.isArray(value)) return value.map(sortValue); if (!isRecord(value)) return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])); }
function rejectUnknown(value, allowed, scope) { for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`Unsupported ${scope} field ${JSON.stringify(key)}.`); }
function boundedText(value, min, max, label) { const source = String(value ?? ""); if (/[^\t\n\r\u0020-\uFFFF]/u.test(source) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(source)) throw new Error(`${label} contains unsupported control characters or malformed Unicode.`); const clean = source.replace(/[\t\n\r]+/g, " ").replace(/\s+/g, " ").trim(); if (clean.length < min || clean.length > max) throw new Error(`${label} must contain ${min === 0 ? `no more than ${max}` : `between ${min} and ${max}`} characters.`); return clean; }
function normalizeHex(value, label) { const source = String(value || ""); if (!HEX.test(source)) throw new Error(`${label} must be a six-digit hex colour.`); return source.toUpperCase(); }
function finiteInteger(value, min, max, label) { const number = Number(value); if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${label} must be an integer from ${min} to ${max}.`); return number; }
function oneOf(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function newId() { return globalThis.crypto.randomUUID(); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function safeSourceSlug(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
function safeDisplayName(value) { return String(value || "Pasted JSON").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 180) || "Pasted JSON"; }
function sourceTitle(value) { return safeWheelFilename(String(value).replace(/\.(?:twl|json|wheel)$/i, ""), "twl").replace(/\.twl$/, "").replace(/[-_]+/g, " ").slice(0, WHEEL_FILE_LIMITS.title) || "Imported wheel"; }
function cleanOptionalTitle(value) { const clean = String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(); return clean ? clean.slice(0, WHEEL_FILE_LIMITS.title) : ""; }
function ascii(bytes, start, end) { return String.fromCharCode(...bytes.slice(start, end)); }
function info(sourceField, target, reason) { return { severity: "info", sourceField, target, reason }; }
function warning(sourceField, target, reason) { return { severity: "warning", sourceField, target, reason }; }

export { decodeBase64, encodeBase64, normalizeMediaType, sha256Hex, validateMedia };
