/* eslint-disable no-control-regex */
export function createMultiWheelImportPlan(result, options = {}) {
  if (!result || !Array.isArray(result.proposals) || !result.proposals.length) throw new Error("The import contains no Wheel proposals.");
  const mode = options.mode === "stages" ? "stages" : "individual";
  const selectedIndexes = Array.isArray(options.selectedIndexes) ? options.selectedIndexes : result.proposals.map((_, index) => index);
  const unique = [...new Set(selectedIndexes.map(Number))];
  if (!unique.length || unique.some((index) => !Number.isInteger(index) || index < 0 || index >= result.proposals.length)) throw new Error("Choose at least one valid Wheel configuration.");
  const wheels = unique.map((index) => ({ sourceIndex: index, proposal: result.proposals[index] }));
  const base = cleanTitle(options.baseTitle || result.topLevelTitle || fileBase(result.sourceName) || "Imported Stage") || "Imported Stage";
  const stages = [];
  if (mode === "stages") {
    const count = Math.ceil(wheels.length / 6);
    for (let offset = 0; offset < wheels.length; offset += 6) stages.push({ title: count === 1 ? base : `${base} — Stage ${stages.length + 1}`, wheels: wheels.slice(offset, offset + 6) });
  }
  return { mode, sourceName: result.sourceName, topLevelTitle: result.topLevelTitle || "", selectedCount: wheels.length, wheels, stages, recordsCreatedDuringPreview: 0 };
}

export function preflightMultiWheelImport(plan, allowance) {
  const wheelsNeeded = plan?.wheels?.length || 0; const stagesNeeded = plan?.mode === "stages" ? plan.stages.length : 0;
  const wheelsAvailable = allowance?.isMasterAdmin ? Number.POSITIVE_INFINITY : Math.max(0, Number(allowance?.maximumOwnedWheels || 0) - Number(allowance?.ownedWheelCount || 0));
  const stagesAvailable = allowance?.isMasterAdmin ? Number.POSITIVE_INFINITY : Math.max(0, Number(allowance?.maximumOwnedStages || 0) - Number(allowance?.ownedStageCount || 0));
  return { ok: wheelsNeeded <= wheelsAvailable && stagesNeeded <= stagesAvailable, wheelsNeeded, wheelsAvailable, stagesNeeded, stagesAvailable };
}

function fileBase(value) { return String(value || "").split(/[\\/]/).pop()?.replace(/\.(?:wheel|json|twl)$/i, "") || ""; }
function cleanTitle(value) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100); }
