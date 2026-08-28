export const BANNER_CONFIG_URL = "/api/catalogue/banner";

export type BannerMessage = {
  text: string;
  ctaLabel: string | null;
  href: string | null;
  newTab: boolean;
};

export type BannerConfig = {
  schema: "thirdrailify-banner-v1";
  normal: {
    enabled: boolean;
    messages: BannerMessage[];
    mode: "static" | "ticker" | "crossfade";
    speed: "slow" | "normal" | "fast";
  };
  live: {
    enabled: boolean;
    label: string;
    showTitle: boolean;
    supportingText: string | null;
    ctaLabel: string;
    ctaPath: "/watch/live";
    animation: "pulse" | "sweep" | "pulse-sweep" | "static";
    intensity: "subtle" | "normal" | "strong";
  };
  updatedAt: string | null;
};

const MODES = new Set(["static", "ticker", "crossfade"]);
const SPEEDS = new Set(["slow", "normal", "fast"]);
const LIVE_ANIMATIONS = new Set(["pulse", "sweep", "pulse-sweep", "static"]);
const INTENSITIES = new Set(["subtle", "normal", "strong"]);

export function normalizeBannerConfig(value: unknown): BannerConfig | null {
  if (!record(value) || value.ok !== true || value.schema !== "thirdrailify-banner-v1" || !record(value.normal) || !record(value.live)) return null;
  const normal = value.normal;
  const live = value.live;
  if (typeof normal.enabled !== "boolean" || !Array.isArray(normal.messages) || normal.messages.length > 5 || !MODES.has(String(normal.mode)) || !SPEEDS.has(String(normal.speed))) return null;
  const messages = normal.messages.map(normalizeMessage);
  if (messages.some((message) => message === null)) return null;
  const label = boundedText(live.label, 32);
  const supportingText = live.supportingText === null ? null : boundedText(live.supportingText, 120);
  const ctaLabel = boundedText(live.ctaLabel, 32);
  if (
    typeof live.enabled !== "boolean" || typeof live.showTitle !== "boolean" || !label || !ctaLabel
    || (live.supportingText !== null && !supportingText) || live.ctaPath !== "/watch/live"
    || !LIVE_ANIMATIONS.has(String(live.animation)) || !INTENSITIES.has(String(live.intensity))
  ) return null;
  const updatedAt = liveDate(value.updatedAt);
  if (value.updatedAt !== null && !updatedAt) return null;
  return {
    schema: "thirdrailify-banner-v1",
    normal: { enabled: normal.enabled, messages: messages as BannerMessage[], mode: normal.mode as BannerConfig["normal"]["mode"], speed: normal.speed as BannerConfig["normal"]["speed"] },
    live: { enabled: live.enabled, label, showTitle: live.showTitle, supportingText, ctaLabel, ctaPath: "/watch/live", animation: live.animation as BannerConfig["live"]["animation"], intensity: live.intensity as BannerConfig["live"]["intensity"] },
    updatedAt,
  };
}

export async function fetchBannerConfig(fetcher: typeof fetch = fetch): Promise<BannerConfig> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher(BANNER_CONFIG_URL, { method: "GET", credentials: "omit", headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`banner_config_http_${response.status}`);
    const config = normalizeBannerConfig(await response.json());
    if (!config) throw new Error("banner_config_invalid");
    return config;
  } finally { window.clearTimeout(timeout); }
}

function normalizeMessage(value: unknown): BannerMessage | null {
  if (!record(value)) return null;
  const text = boundedText(value.text, 160);
  const ctaLabel = value.ctaLabel === null ? null : boundedText(value.ctaLabel, 40);
  const href = value.href === null ? null : safeHref(value.href);
  if (!text || (value.ctaLabel !== null && !ctaLabel) || (value.href !== null && !href) || typeof value.newTab !== "boolean") return null;
  if (Boolean(ctaLabel) !== Boolean(href) || (value.newTab && href?.startsWith("/"))) return null;
  return { text, ctaLabel, href, newTab: value.newTab };
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1024) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api/") && !/[\r\n]/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = [...value].map((character) => { const code = character.codePointAt(0) || 0; return code <= 31 || code === 127 ? " " : character; }).join("").replace(/\s+/g, " ").trim();
  return cleaned && [...cleaned].length <= maximum ? cleaned : null;
}

function liveDate(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
