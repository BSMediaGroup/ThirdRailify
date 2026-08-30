import { createWheel, getWheel, saveWheel, uploadWheelMedia } from "./client";
import { embeddedMediaBlob, type WheelImportProposal } from "./portable.mjs";
import type { Wheel } from "./types";

export class ImportedWheelCreationError extends Error {
  createdWheel: Wheel;
  constructor(message: string, wheel: Wheel) { super(message); this.name = "ImportedWheelCreationError"; this.createdWheel = wheel; }
}

export async function createImportedWheel(proposal: WheelImportProposal, csrfToken: string, onCreated?: (wheel: Wheel) => void) {
  const created = await createWheel({ title: proposal.title, description: proposal.description, visibility: "hidden", lifecycle: "active", config: proposal.config, entries: proposal.entries }, csrfToken);
  onCreated?.(created.wheel);
  try { return await persistImportedWheelMedia(created.wheel, proposal, csrfToken); }
  catch (reason) { throw new ImportedWheelCreationError(`Wheel ${created.wheel.title} was created, but its media is incomplete: ${reason instanceof Error ? reason.message : "media could not be saved"}`, created.wheel); }
}

export async function persistImportedWheelMedia(wheel: Wheel, proposal: WheelImportProposal, csrfToken: string) {
  const replacements = new Map<string, string>();
  for (const item of proposal.media.segments || []) {
    if (!item.runtimeId) continue; const file = embeddedMediaBlob(item); if (!file) continue;
    const uploaded = await uploadWheelMedia(wheel.slug, "segment-fill", file, csrfToken, item.fileName); replacements.set(item.runtimeId, uploaded.asset.id);
  }
  const resolveStyle = <T extends { mode: string; imageAssetId?: string }>(style: T) => style.mode === "image" && style.imageAssetId && replacements.has(style.imageAssetId) ? { ...style, imageAssetId: replacements.get(style.imageAssetId)! } : style;
  let saved = wheel;
  if (replacements.size) {
    const payload = await saveWheel(wheel.slug, { title: proposal.title, description: proposal.description, visibility: "hidden", lifecycle: "active", revision: wheel.revision, config: { ...proposal.config, paletteStyles: proposal.config.paletteStyles?.map(resolveStyle) }, entries: proposal.entries.map((entry) => ({ ...entry, style: entry.style ? resolveStyle(entry.style) : null })) }, csrfToken); saved = payload.wheel;
  }
  for (const [purpose, item] of [["background", proposal.media.background], ["centre", proposal.media.center]] as const) { const file = embeddedMediaBlob(item); if (file) await uploadWheelMedia(saved.slug, purpose, file, csrfToken, item!.fileName); }
  return (await getWheel(saved.slug, { force: true })).wheel;
}
