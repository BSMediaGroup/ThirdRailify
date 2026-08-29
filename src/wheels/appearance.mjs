const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeHexColour(value, label = "Colour") {
  const source = String(value || "").trim();
  if (!HEX.test(source)) throw new Error(`${label} must be a six-digit hex colour.`);
  return source.toUpperCase();
}

export function normalizeCustomPalette(colors, accent) {
  if (!Array.isArray(colors) || colors.length < 1 || colors.length > 5) throw new Error("Custom palettes require between one and five colours.");
  return { colors: colors.map((colour, index) => normalizeHexColour(colour, `Colour ${index + 1}`)), accent: normalizeHexColour(accent, "Accent") };
}

export function applyPaletteToEntries(entries, colors) {
  const palette = normalizeCustomPalette(colors, "#000000").colors;
  const ordered = [...entries].sort((left, right) => left.order - right.order);
  const assignments = new Map(ordered.map((entry, index) => [entry.id, palette[index % palette.length]]));
  return entries.map((entry) => ({ ...entry, colour: assignments.get(entry.id) }));
}

export function paletteColourForEntry(entries, entryId, colors) {
  const palette = normalizeCustomPalette(colors, "#000000").colors;
  const position = [...entries].sort((left, right) => left.order - right.order).findIndex((entry) => entry.id === entryId);
  if (position < 0) throw new Error("Entrant is not in the current wheel.");
  return palette[position % palette.length];
}

export function movePaletteColour(colors, index, direction) {
  const target = index + direction;
  if (index < 0 || index >= colors.length || target < 0 || target >= colors.length) return [...colors];
  const result = [...colors]; [result[index], result[target]] = [result[target], result[index]]; return result;
}
