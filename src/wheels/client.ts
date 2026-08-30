import type { AccessibleWheelSummary, OwnedStageSummary, Stage, StageAccess, StageSummary, Wheel, WheelAccess, WheelMediaAsset, WheelSummary } from "./types";

export type ApiError = Error & { code?: string; status?: number; issues?: Array<{ wheel: string; code: string; message: string }> };
type WheelPayload = { ok: true; wheel: Wheel; access: WheelAccess };
const wheelDetailCache = new Map<string, { expiresAt: number; promise: Promise<WheelPayload> }>();
const WHEEL_DETAIL_CACHE_MS = 30_000;

export async function listWheels(search = "", sort = "recent") { return request<{ ok: true; items: WheelSummary[]; count: number }>(`/api/wheels?search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}`); }
export function getWheel(slug: string, options: { force?: boolean } = {}) {
  const now = Date.now(); const cached = wheelDetailCache.get(slug);
  if (!options.force && cached && cached.expiresAt > now) return cached.promise;
  const promise = request<WheelPayload>(`/api/wheels/${encodeURIComponent(slug)}`).catch((error) => { wheelDetailCache.delete(slug); throw error; });
  wheelDetailCache.set(slug, { expiresAt: now + WHEEL_DETAIL_CACHE_MS, promise });
  return promise;
}
export function prefetchWheel(slug: string) { return getWheel(slug); }
export function invalidateWheel(slug: string) { wheelDetailCache.delete(slug); }
export async function getCreatorAccess() { return request<{ ok: true; authenticated: boolean; canCreate: boolean; isMasterAdmin: boolean; maximumOwnedWheels?: number; ownedWheelCount?: number; maximumOwnedStages?: number; ownedStageCount?: number }>("/api/wheels/access"); }
export async function createWheel(input: Record<string, unknown>, csrfToken: string) { return request<{ ok: true; wheel: Wheel; access: WheelAccess }>("/api/wheels", { method: "POST", headers: csrf(csrfToken), body: JSON.stringify(input) }); }
export async function saveWheel(slug: string, input: Record<string, unknown>, csrfToken: string) { invalidateWheel(slug); return request<WheelPayload>(`/api/wheels/${encodeURIComponent(slug)}`, { method: "PUT", headers: csrf(csrfToken), body: JSON.stringify(input) }); }
export type OfficialAnimationPlan = { version: "spin-plan-v1"; landingFraction: number; turnRandom: number };
export async function officialSpin(slug: string, revision: number, idempotencyKey: string, csrfToken: string) { return request<{ ok: true; spin: { id: string; winningEntryId: string; winningLabel: string; createdAt: string; animationPlan: OfficialAnimationPlan }; idempotent: boolean }>(`/api/wheels/${encodeURIComponent(slug)}/spins`, { method: "POST", headers: csrf(csrfToken), body: JSON.stringify({ revision, idempotencyKey }) }); }
export async function winnerAction(slug: string, entryId: string, action: string, csrfToken: string) { invalidateWheel(slug); return request<WheelPayload>(`/api/wheels/${encodeURIComponent(slug)}/winner-action`, { method: "POST", headers: csrf(csrfToken), body: JSON.stringify({ entryId, action }) }); }
export async function lifecycleAction(slug: string, action: string, csrfToken: string) { invalidateWheel(slug); return request<WheelPayload>(`/api/wheels/${encodeURIComponent(slug)}/lifecycle`, { method: "POST", headers: csrf(csrfToken), body: JSON.stringify({ action }) }); }
export async function uploadWheelMedia(slug: string, purpose: "background" | "centre" | "segment-fill", file: Blob, csrfToken: string, filename = "") { return request<{ ok: true; reused?: boolean; asset: WheelMediaAsset }>(`/api/wheels/${encodeURIComponent(slug)}/media/${purpose}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-CSRF-Token": csrfToken, ...(filename ? { "X-ThirdRailify-Filename": filename } : {}) }, body: file }); }
export async function removeWheelMedia(slug: string, purpose: "background" | "centre", csrfToken: string) { return request<{ ok: true; removed: boolean; purpose: string }>(`/api/wheels/${encodeURIComponent(slug)}/media/${purpose}`, { method: "DELETE", headers: csrf(csrfToken), body: "{}" }); }
export async function listPublicStages(search = "", sort = "recent") { return request<{ ok: true; items: StageSummary[]; count: number }>(`/api/wheels/stages?view=public&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}`); }
export async function listOwnedStages() { return request<{ ok: true; items: OwnedStageSummary[]; count: number }>("/api/wheels/stages"); }
export async function listAccessibleWheels(search = "", scope = "accessible") { return request<{ ok: true; items: AccessibleWheelSummary[]; count: number }>(`/api/wheels/stages/lookup?search=${encodeURIComponent(search)}&scope=${encodeURIComponent(scope)}`); }
export async function getStage(slug: string) { return request<{ ok: true; stage: Stage; access: StageAccess }>(`/api/wheels/stages/${encodeURIComponent(slug)}`); }
export async function createStage(input: Record<string, unknown>, csrfToken: string) { return request<{ ok: true; stage: Stage; access: StageAccess }>("/api/wheels/stages", { method: "POST", headers: csrf(csrfToken), body: JSON.stringify(input) }); }
export async function saveStage(slug: string, input: Record<string, unknown>, csrfToken: string) { return request<{ ok: true; stage: Stage; access: StageAccess }>(`/api/wheels/stages/${encodeURIComponent(slug)}`, { method: "PUT", headers: csrf(csrfToken), body: JSON.stringify(input) }); }
export async function archiveStage(slug: string, csrfToken: string) { return request<{ ok: true; stage: Stage; access: StageAccess }>(`/api/wheels/stages/${encodeURIComponent(slug)}/lifecycle`, { method: "POST", headers: csrf(csrfToken), body: JSON.stringify({ action: "archive" }) }); }
export type StageOfficialSpinResult = { position: number; wheelSlug: string; wheelTitle: string; spin: { id: string; winningEntryId: string; winningLabel: string; winningWeight: number; wheelRevision: number; snapshotHash: string; createdAt: string; animationPlan: OfficialAnimationPlan } };
export async function officialSpinAll(slug: string, stageRevision: number, wheels: Array<{ slug: string; revision: number }>, batchKey: string, csrfToken: string) { return request<{ ok: true; mode: "official"; idempotent: boolean; results: StageOfficialSpinResult[] }>(`/api/wheels/stages/${encodeURIComponent(slug)}/spin-all`, { method: "POST", headers: csrf(csrfToken), body: JSON.stringify({ stageRevision, wheels, batchKey }) }); }
function csrf(token: string) { return { "Content-Type": "application/json", "X-CSRF-Token": token }; }
async function request<T>(input: string, init: RequestInit = {}) { const response = await fetch(input, { ...init, headers: { Accept: "application/json", ...(init.headers || {}) }, credentials: "include", cache: "no-store" }); const payload = await response.json().catch(() => null) as (T & { error?: string; message?: string; issues?: ApiError["issues"] }) | null; if (!response.ok || !payload) { const error = new Error(payload?.message || "The wheel service is unavailable.") as ApiError; error.code = payload?.error; error.status = response.status; error.issues = payload?.issues; throw error; } return payload; }
