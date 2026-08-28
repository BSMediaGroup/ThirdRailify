import { normalizeCandidate, type BroadcastCandidate } from "./broadcast";

const EPISODE_ID = /^ep_[a-f0-9]{64}$/;
const REQUEST_TIMEOUT_MS = 8000;

export type WatchEpisode = BroadcastCandidate & { id: string; archiveDate: string };
export type EpisodeList = {
  items: WatchEpisode[];
  summary: { slotCount: 24; visibleCount: number; placeholderCount: number };
};
export type EpisodeDetail = {
  item: WatchEpisode;
  archive: {
    position: number;
    visibleCount: number;
    previous: { id: string; title: string; route: string } | null;
    next: { id: string; title: string; route: string } | null;
  };
};

export function featuredEpisodes(items: WatchEpisode[], currentKey: string | null, limit = 5): WatchEpisode[] {
  return items.filter((episode) => !currentKey || episode.key !== currentKey).slice(0, limit);
}

export async function fetchEpisodes(fetcher: typeof fetch = fetch): Promise<EpisodeList> {
  return timedJson("/api/watch/episodes", normalizeList, fetcher);
}

export async function fetchEpisode(episodeId: string, fetcher: typeof fetch = fetch): Promise<EpisodeDetail | null> {
  if (!EPISODE_ID.test(episodeId)) return null;
  try { return await timedJson(`/api/watch/episodes/${encodeURIComponent(episodeId)}`, normalizeDetail, fetcher); }
  catch (error) { if (error instanceof EpisodeHttpError && error.status === 404) return null; throw error; }
}

function normalizeList(value: unknown): EpisodeList | null {
  if (!record(value) || value.schema !== "thirdrailify-watch-episodes-v1" || !Array.isArray(value.items) || value.items.length > 24 || !record(value.summary)) return null;
  const items = value.items.map(normalizeEpisode);
  const visibleCount = Number(value.summary.visibleCount);
  const placeholderCount = Number(value.summary.placeholderCount);
  if (items.some((item) => !item) || value.summary.slotCount !== 24 || visibleCount !== items.length || placeholderCount !== 24 - items.length) return null;
  return { items: items as WatchEpisode[], summary: { slotCount: 24, visibleCount, placeholderCount } };
}

function normalizeDetail(value: unknown): EpisodeDetail | null {
  if (!record(value) || value.schema !== "thirdrailify-watch-episode-v1" || !record(value.archive)) return null;
  const item = normalizeEpisode(value.item);
  const position = Number(value.archive.position);
  const visibleCount = Number(value.archive.visibleCount);
  const previous = normalizeNeighbour(value.archive.previous);
  const next = normalizeNeighbour(value.archive.next);
  if (!item || !Number.isInteger(position) || position < 1 || !Number.isInteger(visibleCount) || visibleCount < 1 || previous === false || next === false) return null;
  return { item, archive: { position, visibleCount, previous, next } };
}

function normalizeEpisode(value: unknown): WatchEpisode | null {
  if (!record(value) || !EPISODE_ID.test(String(value.id || "")) || typeof value.archiveDate !== "string" || !Number.isFinite(Date.parse(value.archiveDate))) return null;
  const candidate = normalizeCandidate(value);
  return candidate ? { ...candidate, id: String(value.id), archiveDate: new Date(value.archiveDate).toISOString() } : null;
}

function normalizeNeighbour(value: unknown) {
  if (value === null) return null;
  if (!record(value) || !EPISODE_ID.test(String(value.id || "")) || typeof value.title !== "string" || value.title.length > 256 || value.route !== `/watch/v/${value.id}`) return false;
  return { id: String(value.id), title: value.title.trim(), route: value.route };
}

async function timedJson<T>(url: string, normalize: (value: unknown) => T | null, fetcher: typeof fetch): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, { method: "GET", credentials: "omit", headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new EpisodeHttpError(response.status);
    const value = normalize(await response.json());
    if (!value) throw new Error("watch_episode_invalid_payload");
    return value;
  } finally { window.clearTimeout(timeout); }
}

class EpisodeHttpError extends Error {
  constructor(public status: number) { super(`watch_episode_http_${status}`); }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
