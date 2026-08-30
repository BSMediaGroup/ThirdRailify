/* eslint-disable no-control-regex */
const HEX = /^#[0-9a-f]{6}$/i;

export function convertWheelOfNames(document, options) {
  const configs = document.wheelConfigs;
  if (!Array.isArray(configs) || !configs.length) throw new Error("This Wheel of Names file contains no wheel configurations.");
  if (configs.length > options.maxWheelConfigs) throw new Error(`A maximum of ${options.maxWheelConfigs} wheel configurations can be imported at once.`);
  return configs.map((source, configIndex) => convertConfig(source, document, options, configIndex));
}

function convertConfig(source, document, options, configIndex) {
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`Wheel configuration ${configIndex + 1} is invalid.`);
  const messages = [];
  const number = String(configIndex + 1).padStart(2, "0");
  const topLevelTitle = cleanText(document.title, options.maxTitle);
  const fileTitle = cleanText(options.sourceTitle, options.maxTitle);
  const title = cleanText(source.title, options.maxTitle)
    || cleanText(topLevelTitle ? `${topLevelTitle} — Wheel ${number}` : "", options.maxTitle)
    || cleanText(fileTitle ? `${fileTitle} — Wheel ${number}` : "", options.maxTitle)
    || `Imported Wheel ${number}`;
  const description = cleanText(source.description, options.maxDescription) || cleanText(document.description, options.maxDescription);
  const palette = enabledPalette(source.colorSettings, options, messages);
  if (!Array.isArray(source.entries) || !source.entries.length) throw new Error(`Wheel configuration ${configIndex + 1} has no valid entries.`);
  if (source.entries.length > options.maxEntries) throw new Error(`Wheel configuration ${configIndex + 1} exceeds the ${options.maxEntries}-entry limit.`);
  const entries = source.entries.map((entry, index) => convertEntry(entry, index, palette, options, messages));
  const config = { ...options.defaultConfig, palette, paletteStyles: undefined, themePreset: "third-rail-gold" };

  if (source.spinTime != null && source.spinTime !== "") {
    const seconds = Number(source.spinTime);
    if (!Number.isFinite(seconds)) throw new Error("spinTime must be a finite number.");
    const requested = Math.round(seconds * 1000);
    config.spinDurationMs = clamp(requested, options.minSpinDurationMs, options.maxSpinDurationMs);
    messages.push(message(requested === config.spinDurationMs ? "info" : "warning", "spinTime", "spinDurationMs", requested === config.spinDurationMs ? `Mapped ${seconds} seconds.` : `Clamped ${seconds} seconds to ${config.spinDurationMs / 1000} seconds.`));
  }
  const duringSound = enabledSound(source.duringSpinSound);
  config.tickingSoundEnabled = duringSound;
  messages.push(message("info", "duringSpinSound", "tickingSoundEnabled", duringSound ? "Mapped to the built-in generated tick sound." : "Mapped to disabled."));
  if (nonDefault(source.duringSpinSoundVolume, 50)) messages.push(message("warning", "duringSpinSoundVolume", "not imported", "Third Railify does not expose tick volume."));
  const afterSound = enabledSound(source.afterSpinSound);
  config.winnerSoundEnabled = afterSound;
  messages.push(message("info", "afterSpinSound", "winnerSoundEnabled", afterSound ? `Mapped ${JSON.stringify(String(source.afterSpinSound))} to the built-in winner stinger; no audio file was imported.` : "Mapped to disabled."));
  if (nonDefault(source.afterSpinSoundVolume, 50)) messages.push(message("warning", "afterSpinSoundVolume", "not imported", "Third Railify does not expose winner-stinger volume."));
  if (typeof source.launchConfetti === "boolean") config.confettiEnabled = source.launchConfetti;
  if (typeof source.animateWinner === "boolean") config.winnerLightingEnabled = source.animateWinner;
  config.celebrationEnabled = config.confettiEnabled || config.winnerLightingEnabled;
  if (source.winnerMessage) config.winnerMessageTemplate = cleanText(source.winnerMessage, options.maxWinnerMessage) || config.winnerMessageTemplate;
  if (source.displayWinnerDialog === false) messages.push(message("warning", "displayWinnerDialog", "result remains visible", "Third Railify always presents the selected result."));
  if (source.autoRemoveWinner === true) messages.push(message("warning", "autoRemoveWinner", "not imported", "Third Railify requires an explicit, authorized post-win action."));
  if (source.slowSpin === true) messages.push(message("warning", "slowSpin", "not imported", "spinTime is the truthful duration equivalent and was used instead."));

  const media = {
    background: decodeDataUri(source.customCoverImageDataUri, "background", source.coverImageName, options, messages),
    center: decodeDataUri(source.customPictureDataUri, "center", source.customPictureName, options, messages),
  };

  const mapped = new Set(["title", "description", "entries", "colorSettings", "spinTime", "duringSpinSound", "duringSpinSoundVolume", "afterSpinSound", "afterSpinSoundVolume", "launchConfetti", "animateWinner", "winnerMessage", "displayWinnerDialog", "autoRemoveWinner", "slowSpin", "customCoverImageDataUri", "coverImageName", "customPictureDataUri", "customPictureName"]);
  if (source.allowDuplicates === true) messages.push(message("info", "allowDuplicates", "duplicate entries preserved", "Duplicate labels remain distinct participants."));
  if (Number(source.maxNames) === options.maxEntries) messages.push(message("info", "maxNames", "authoritative entry limit retained", `Third Railify independently enforces ${options.maxEntries} entries.`));
  const handled = new Set(["allowDuplicates", "maxNames"]);
  for (const [field, value] of Object.entries(source)) {
    if (mapped.has(field) || handled.has(field) || field === "id") continue;
    if (value == null || value === "" || value === false) continue;
    messages.push(message("warning", field, "not imported", unsupportedReason(field)));
  }
  if (Object.hasOwn(document, "shareMode") && document.shareMode != null) messages.push(message("warning", "shareMode", "not imported", "Sharing state cannot grant access to a Third Railify wheel."));
  else messages.push(message("info", "shareMode", "ignored", "No Third Railify access or permissions were imported."));
  messages.push(message("info", "entries[].id", "fresh local IDs", "Wheel of Names entry IDs are not trusted and were regenerated."));
  messages.push(message("info", "official history", "never imported", "Portable files contain creator-editable content only."));
  return { title, description, config, entries, media, messages, sourceIndex: configIndex };
}

function convertEntry(value, index, palette, options, messages) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Entry ${index + 1} is invalid.`);
  const label = cleanText(value.text ?? value.label ?? value.name, options.maxEntryLabel);
  if (!label) throw new Error(`Entry ${index + 1} has no valid label.`);
  let weight = 1;
  if (value.weight != null && value.weight !== "") {
    const parsed = Number(value.weight);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > options.maxWeight) throw new Error(`Entry ${index + 1} has an invalid weight.`);
    weight = parsed;
  }
  let colour = null;
  const candidate = value.color ?? value.colour;
  if (candidate != null && candidate !== "") {
    if (!HEX.test(String(candidate))) throw new Error(`Entry ${index + 1} has an invalid colour.`);
    colour = String(candidate).toUpperCase();
  } else colour = palette[index % palette.length];
  let state = "active";
  if (value.enabled === false || value.active === false || value.hidden === true || value.disabled === true) state = "hidden";
  if (value.id != null && index === 0) messages.push(message("info", "entries[].id", "fresh local IDs", "Imported source IDs are informational only."));
  return { id: options.newId(), label, order: index, weight, colour, state };
}

function enabledPalette(value, options, messages) {
  const colours = Array.isArray(value) ? value.filter((row) => row && typeof row === "object" && row.enabled === true && HEX.test(String(row.color || ""))).map((row) => String(row.color).toUpperCase()).slice(0, options.maxPalette) : [];
  if (colours.length >= 1) { messages.push(message("info", "colorSettings", "palette", `Mapped ${colours.length} enabled colour${colours.length === 1 ? "" : "s"} as a custom palette.`)); return colours; }
  messages.push(message("warning", "colorSettings", "Third Rail Gold palette", "No enabled valid colours were available."));
  return [...options.defaultConfig.palette];
}

function decodeDataUri(value, purpose, name, options, messages) {
  if (value == null || value === "") return null;
  const match = String(value).match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/);
  if (!match) throw new Error(`${purpose} media has an invalid data URI.`);
  const mimeType = options.normalizeMediaType(match[1]);
  const bytes = options.decodeBase64(match[2]);
  options.validateMedia(bytes, mimeType, purpose);
  messages.push(message("info", purpose === "background" ? "customCoverImageDataUri" : "customPictureDataUri", `${purpose} media proposal`, "Decoded locally; it will not upload until Save."));
  return { mode: "embedded", fileName: options.safeMediaName(name, purpose, mimeType), mimeType, sha256: "", base64: options.encodeBase64(bytes) };
}

function enabledSound(value) { return !(value == null || value === false || String(value).trim() === "" || String(value).toLowerCase() === "none"); }
function cleanText(value, max) { return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function message(severity, sourceField, target, reason) { return { severity, sourceField, target, reason }; }
function nonDefault(value, fallback) { return value != null && value !== "" && value !== fallback; }
function unsupportedReason(field) { if (field === "maxNames") return "The authoritative Third Railify participant maximum cannot be overridden."; if (/font|shadow|outline|gradient|hub|title|text|picture|type/i.test(field)) return "There is no exact creator-facing Third Railify equivalent."; return "No exact safe Third Railify equivalent exists."; }
