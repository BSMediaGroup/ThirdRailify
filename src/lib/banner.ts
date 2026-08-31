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
    dismissible: boolean;
    messages: BannerMessage[];
    mode: "static" | "ticker" | "crossfade";
    speed: "slow" | "normal" | "fast";
    glyph: "zap" | "arrow" | "diamond" | "dot";
    glyphSize: "small" | "medium" | "large";
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
  homeRail: {
    enabled: boolean;
    items: string[];
    mode: "marquee" | "crossfade" | "static";
    speed: "slow" | "normal" | "fast";
    easing: "linear" | "ease-in-out";
    glyph: "zap" | "arrow" | "diamond" | "dot";
    glyphSize: "small" | "medium" | "large";
  };
  updatedAt: string | null;
};

export const DEFAULT_HOME_RAIL: BannerConfig["homeRail"] = {
  enabled: true,
  items: ["THIRD RAILIFY", "NEWS HANGOUT", "ABOOT NOTHING", "POP CULTURE BEAT DOWN"],
  mode: "marquee",
  speed: "normal",
  easing: "linear",
  glyph: "zap",
  glyphSize: "medium",
};

const MODES = new Set(["static", "ticker", "crossfade"]);
const SPEEDS = new Set(["slow", "normal", "fast"]);
const LIVE_ANIMATIONS = new Set(["pulse", "sweep", "pulse-sweep", "static"]);
const INTENSITIES = new Set(["subtle", "normal", "strong"]);
const HOME_RAIL_MODES = new Set(["marquee", "crossfade", "static"]);
const HOME_RAIL_EASINGS = new Set(["linear", "ease-in-out"]);
const HOME_RAIL_GLYPHS = new Set(["zap", "arrow", "diamond", "dot"]);
const HOME_RAIL_GLYPH_SIZES = new Set(["small", "medium", "large"]);

export function normalizeBannerConfig(value: unknown): BannerConfig | null {
  if (!record(value) || value.ok !== true || value.schema !== "thirdrailify-banner-v1" || !record(value.normal) || !record(value.live)) return null;
  const normal = value.normal;
  const live = value.live;
  const homeRail = record(value.homeRail) ? value.homeRail : DEFAULT_HOME_RAIL;
  if (typeof normal.enabled !== "boolean" || (normal.dismissible !== undefined && typeof normal.dismissible !== "boolean") || !Array.isArray(normal.messages) || normal.messages.length > 5 || !MODES.has(String(normal.mode)) || !SPEEDS.has(String(normal.speed)) || (normal.glyph !== undefined && !HOME_RAIL_GLYPHS.has(String(normal.glyph))) || (normal.glyphSize !== undefined && !HOME_RAIL_GLYPH_SIZES.has(String(normal.glyphSize)))) return null;
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
  if (typeof homeRail.enabled !== "boolean" || !Array.isArray(homeRail.items) || homeRail.items.length < 1 || homeRail.items.length > 8 || !HOME_RAIL_MODES.has(String(homeRail.mode)) || !SPEEDS.has(String(homeRail.speed)) || !HOME_RAIL_EASINGS.has(String(homeRail.easing)) || !HOME_RAIL_GLYPHS.has(String(homeRail.glyph)) || (homeRail.glyphSize !== undefined && !HOME_RAIL_GLYPH_SIZES.has(String(homeRail.glyphSize)))) return null;
  const railItems = homeRail.items.map((item) => boundedText(item, 80));
  if (railItems.some((item) => !item)) return null;
  return {
    schema: "thirdrailify-banner-v1",
    normal: { enabled: normal.enabled, dismissible: typeof normal.dismissible === "boolean" ? normal.dismissible : false, messages: messages as BannerMessage[], mode: normal.mode as BannerConfig["normal"]["mode"], speed: normal.speed as BannerConfig["normal"]["speed"], glyph: (normal.glyph ?? "zap") as BannerConfig["normal"]["glyph"], glyphSize: (normal.glyphSize ?? "medium") as BannerConfig["normal"]["glyphSize"] },
    live: { enabled: live.enabled, label, showTitle: live.showTitle, supportingText, ctaLabel, ctaPath: "/watch/live", animation: live.animation as BannerConfig["live"]["animation"], intensity: live.intensity as BannerConfig["live"]["intensity"] },
    homeRail: { enabled: homeRail.enabled, items: railItems as string[], mode: homeRail.mode as BannerConfig["homeRail"]["mode"], speed: homeRail.speed as BannerConfig["homeRail"]["speed"], easing: homeRail.easing as BannerConfig["homeRail"]["easing"], glyph: homeRail.glyph as BannerConfig["homeRail"]["glyph"], glyphSize: (homeRail.glyphSize ?? "medium") as BannerConfig["homeRail"]["glyphSize"] },
    updatedAt,
  };
}

export async function fetchBannerConfig(fetcher: typeof fetch = fetch): Promise<BannerConfig> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher(BANNER_CONFIG_URL, { method: "GET", credentials: "omit", cache: "no-cache", headers: { Accept: "application/json" }, signal: controller.signal });
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
