const HEX = /^#[0-9a-f]{6}$/i;
const ASSET_ID = /^[a-f0-9-]{16,80}$/i;

export const SEGMENT_PATTERN_IDS = Object.freeze([
  "diagonal-stripes",
  "reverse-stripes",
  "zigzag",
  "dots",
  "checkers",
  "triangles",
  "chevrons",
  "waves",
  "third-rail-bolts",
]);
export const SEGMENT_PATTERN_LABELS = Object.freeze({
  "diagonal-stripes": "Diagonal stripes",
  "reverse-stripes": "Reverse stripes",
  zigzag: "Zigzag",
  dots: "Dots",
  checkers: "Checkers",
  triangles: "Triangles",
  chevrons: "Chevrons",
  waves: "Waves / swirl",
  "third-rail-bolts": "Third Rail bolts",
});
export const SPIN_SOUND_PRESETS = Object.freeze([
  ["classic-tick", "Classic tick"],
  ["relay-click", "Relay click"],
  ["arc-pulse", "Arc pulse"],
  ["mechanical-ratchet", "Mechanical ratchet"],
  ["soft-tick", "Soft tick"],
  ["silent", "Silent"],
]);
export const WINNER_SOUND_PRESETS = Object.freeze([
  ["gold-rise", "Gold rise"],
  ["broadcast-hit", "Broadcast hit"],
  ["voltage-chime", "Voltage chime"],
  ["crimson-impact", "Crimson impact"],
  ["synth-fanfare", "Synth fanfare"],
  ["short-burst", "Short burst"],
  ["silent", "Silent"],
]);

const PATTERNS = new Set(SEGMENT_PATTERN_IDS);
const SPIN_SOUNDS = new Set(SPIN_SOUND_PRESETS.map(([id]) => id));
const WINNER_SOUNDS = new Set(WINNER_SOUND_PRESETS.map(([id]) => id));

export function solidSegmentStyle(color) {
  return { mode: "solid", color: normalizeStyleHex(color, "Segment colour") };
}

export function normalizeSegmentStyle(value, fallbackColor = "#F3C928") {
  const fallback = normalizeStyleHex(fallbackColor, "Fallback colour");
  if (typeof value === "string") return solidSegmentStyle(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return solidSegmentStyle(fallback);
  const mode = String(value.mode || "solid").toLowerCase();
  const color = normalizeStyleHex(value.color || value.colour || fallback, "Segment colour");
  if (mode === "solid") return { mode, color };
  if (mode === "pattern") {
    const pattern = String(value.pattern || "");
    if (!PATTERNS.has(pattern)) throw new Error("Choose a supported segment pattern.");
    return { mode, color, pattern, patternColor: normalizeStyleHex(value.patternColor, "Pattern colour") };
  }
  if (mode === "image") {
    const imageAssetId = String(value.imageAssetId || "");
    if (!ASSET_ID.test(imageAssetId)) throw new Error("Choose a valid wheel segment image.");
    return { mode, color, imageAssetId };
  }
  throw new Error("Choose Solid, Pattern, or Image for the segment fill.");
}

export function normalizePaletteStyles(styles, legacyPalette) {
  const palette = Array.isArray(legacyPalette) && legacyPalette.length ? legacyPalette : ["#F3C928"];
  if (styles == null) return palette.map((color) => solidSegmentStyle(color));
  if (!Array.isArray(styles) || !styles.length || styles.length > 12) throw new Error("Choose between one and twelve palette styles.");
  return styles.map((style, index) => normalizeSegmentStyle(style, palette[index % palette.length]));
}

export function styleForEntry(entries, entryId, paletteStyles) {
  const ordered = [...entries].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const index = ordered.findIndex((entry) => entry.id === entryId);
  if (index < 0) throw new Error("Entrant is not in the current wheel.");
  return normalizeSegmentStyle(paletteStyles[index % paletteStyles.length]);
}

export function applyPaletteStylesToEntries(entries, paletteStyles) {
  const styles = normalizePaletteStyles(paletteStyles, paletteStyles.map((style) => style?.color || "#F3C928"));
  const ordered = [...entries].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const assignments = new Map(ordered.map((entry, index) => [entry.id, styles[index % styles.length]]));
  return entries.map((entry) => {
    const style = { ...assignments.get(entry.id) };
    return { ...entry, colour: style.color, style };
  });
}

export function resolvedEntryStyle(entry, config) {
  const palette = normalizePaletteStyles(config?.paletteStyles, config?.palette);
  const assigned = palette[Math.max(0, Number(entry?.order) || 0) % palette.length];
  return entry?.style ? normalizeSegmentStyle(entry.style, entry.colour || assigned.color) : entry?.colour ? solidSegmentStyle(entry.colour) : assigned;
}

export function segmentImageAssetIds(config, entries) {
  const ids = new Set();
  for (const style of [...normalizePaletteStyles(config?.paletteStyles, config?.palette), ...(entries || []).map((entry) => entry.style).filter(Boolean)]) {
    const normalized = normalizeSegmentStyle(style);
    if (normalized.mode === "image") ids.add(normalized.imageAssetId);
  }
  return [...ids].sort();
}

export function normalizeSpinSoundPreset(value) {
  return SPIN_SOUNDS.has(String(value || "")) ? String(value) : "classic-tick";
}
export function normalizeWinnerSoundPreset(value) {
  return WINNER_SOUNDS.has(String(value || "")) ? String(value) : "gold-rise";
}

export function pointerAccentShades(value) {
  const color = normalizeStyleHex(value, "Pointer accent");
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16) / 255);
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min;
  let hue = 0;
  if (delta) hue = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  const hsl = (l, s = saturation) => `hsl(${Math.round(hue)} ${Math.round(Math.min(.94, Math.max(.34, s)) * 100)}% ${Math.round(Math.min(.78, Math.max(.12, l)) * 100)}%)`;
  return Object.freeze({ dark: hsl(lightness * .48), base: color, light: hsl(lightness + (1 - lightness) * .34), glow: hsl(lightness + (1 - lightness) * .48, saturation * .9) });
}

function normalizeStyleHex(value, label) {
  const source = String(value || "").trim();
  if (!HEX.test(source)) throw new Error(`${label} must be a six-digit hex colour.`);
  return source.toUpperCase();
}
