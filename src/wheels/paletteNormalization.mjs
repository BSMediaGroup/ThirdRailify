const HEX = /^#[0-9a-f]{6}$/i;
const RUNTIME_ASSET_ID = /^[a-f0-9-]{16,80}$/i;
const PORTABLE_ASSET_REF = /^segment-[a-f0-9]{12,64}$/i;
const PATTERNS = new Set([
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

export const THIRD_RAIL_GOLD_PALETTE = Object.freeze([
  "#F3C928",
  "#B8182F",
  "#F3F0E5",
  "#20201A",
]);

export function normalizeImportedPalette(paletteValue, stylesValue, options = {}) {
  const defaults = usableDefaults(options.defaultPalette);
  const maximum = Math.max(1, Math.min(12, Number(options.maxPalette) || 12));
  const warnings = [];
  const sourcePalette = Array.isArray(paletteValue) ? paletteValue : [];
  const palette = sourcePalette.slice(0, maximum).map((value, index) => {
    if (isHex(value)) return normalizeHex(value);
    warnings.push(repair("invalid-palette-colour", "warning", `Palette colour ${index + 1} was replaced with the corresponding Third Rail Gold colour.`));
    return defaults[index % defaults.length];
  });

  if (sourcePalette.length > maximum) warnings.push(repair("extra-palette-colours", "warning", `${sourcePalette.length - maximum} extra palette colour${sourcePalette.length - maximum === 1 ? " was" : "s were"} ignored.`));
  if (!palette.length || !palette.some((value, index) => isHex(sourcePalette[index]))) {
    palette.splice(0, palette.length, ...defaults.slice(0, maximum));
    warnings.push(repair("default-palette", "warning", "No compatible palette was found. Third Rail Gold will be used."));
  }

  const sourceStyles = Array.isArray(stylesValue) ? stylesValue : [];
  const paletteStyles = [];
  let missing = 0;
  let invalidPatterns = 0;
  let invalidImages = 0;
  let invalidStyles = 0;
  let colourConflicts = 0;
  for (let index = 0; index < palette.length; index += 1) {
    const source = sourceStyles[index];
    if (source == null) {
      missing += 1;
      paletteStyles.push({ mode: "solid", color: palette[index] });
      continue;
    }
    const normalized = normalizeImportedSegmentStyle(source, palette[index], options);
    if (normalized.repair === "pattern") invalidPatterns += 1;
    else if (normalized.repair === "image") invalidImages += 1;
    else if (normalized.repair === "style") invalidStyles += 1;
    if (normalized.style.color !== palette[index]) colourConflicts += 1;
    palette[index] = normalized.style.color;
    paletteStyles.push(normalized.style);
  }

  if (!sourceStyles.length) warnings.push(repair("legacy-styles-generated", "info", `${palette.length} solid style${palette.length === 1 ? " was" : "s were"} generated from legacy palette colours.`));
  else if (missing) warnings.push(repair("missing-styles", "warning", `${missing} missing palette style${missing === 1 ? " was" : "s were"} repaired.`));
  if (sourceStyles.length > palette.length) warnings.push(repair("extra-styles", "warning", `${sourceStyles.length - palette.length} extra palette-style row${sourceStyles.length - palette.length === 1 ? " was" : "s were"} ignored.`));
  if (colourConflicts) warnings.push(repair("style-colour-authority", "info", `${colourConflicts} palette colour${colourConflicts === 1 ? " was" : "s were"} aligned to the richer style fallback colour.`));
  if (invalidPatterns) warnings.push(repair("pattern-fallback", "warning", `${invalidPatterns} unsupported pattern${invalidPatterns === 1 ? " was" : "s were"} replaced with its fallback colour.`));
  if (invalidImages) warnings.push(repair("image-fallback", "warning", invalidImages === 1 ? "Segment image could not be imported; fallback colour will be used." : `${invalidImages} segment images could not be imported; fallback colours will be used.`));
  if (invalidStyles) warnings.push(repair("style-fallback", "warning", `${invalidStyles} unsupported palette style${invalidStyles === 1 ? " was" : "s were"} replaced with a solid fallback colour.`));

  return { palette, paletteStyles, warnings };
}

export function normalizeImportedSegmentStyle(value, fallbackValue, options = {}) {
  const fallback = isHex(fallbackValue) ? normalizeHex(fallbackValue) : THIRD_RAIL_GOLD_PALETTE[0];
  if (typeof value === "string") return isHex(value) ? { style: { mode: "solid", color: normalizeHex(value) }, repair: null } : { style: { mode: "solid", color: fallback }, repair: "style" };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { style: { mode: "solid", color: fallback }, repair: "style" };
  const color = isHex(value.color ?? value.colour) ? normalizeHex(value.color ?? value.colour) : fallback;
  const mode = String(value.mode || "solid").toLowerCase();
  if (mode === "solid") return { style: { mode, color }, repair: null };
  if (mode === "pattern") {
    if (PATTERNS.has(String(value.pattern || "")) && isHex(value.patternColor)) return { style: { mode, color, pattern: String(value.pattern), patternColor: normalizeHex(value.patternColor) }, repair: null };
    return { style: { mode: "solid", color }, repair: "pattern" };
  }
  if (mode === "image") {
    const runtimeId = String(value.imageAssetId || "");
    const portableRef = String(value.imageAssetRef || "");
    const availableRuntime = options.availableImageAssetIds == null || options.availableImageAssetIds.has(runtimeId);
    const availablePortable = options.availableImageAssetRefs == null || options.availableImageAssetRefs.has(portableRef);
    if (runtimeId && RUNTIME_ASSET_ID.test(runtimeId) && availableRuntime) return { style: { mode, color, imageAssetId: runtimeId }, repair: null };
    if (portableRef && PORTABLE_ASSET_REF.test(portableRef) && availablePortable) return { style: { mode, color, imageAssetRef: portableRef }, repair: null };
    return { style: { mode: "solid", color }, repair: "image" };
  }
  return { style: { mode: "solid", color }, repair: "style" };
}

export function hasPaletteRepairs(messages) {
  return Array.isArray(messages) && messages.some((item) => item?.target === "canonical palette" && item?.severity !== "error");
}

function usableDefaults(value) {
  const source = Array.isArray(value) ? value.filter(isHex).map(normalizeHex) : [];
  return source.length ? source : [...THIRD_RAIL_GOLD_PALETTE];
}
function isHex(value) { return HEX.test(String(value || "")); }
function normalizeHex(value) { return String(value).toUpperCase(); }
function repair(code, severity, reason) { return { code, severity, reason }; }
