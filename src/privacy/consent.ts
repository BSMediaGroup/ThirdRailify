export const CONSENT_COOKIE_NAME = "thirdrailify_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_LIFETIME_MS = 1000 * 60 * 60 * 24 * 183;

export const OPTIONAL_STORAGE_KEYS = [
  "thirdrailify.storefront.currency.v1",
  "thirdrailify.storefront.currency-rates.v1",
  "thirdrailify-goats-draft-v2",
] as const;

export type OptionalConsent = {
  preferences: boolean;
  externalMedia: boolean;
};

export type ConsentRecord = {
  version: number;
  timestamp: string;
  expiry: string;
  categories: OptionalConsent;
};

export const ESSENTIAL_ONLY: OptionalConsent = Object.freeze({ preferences: false, externalMedia: false });
export const ALL_OPTIONAL: OptionalConsent = Object.freeze({ preferences: true, externalMedia: true });

export function normalizeCategories(value: unknown): OptionalConsent {
  if (!value || typeof value !== "object") return { ...ESSENTIAL_ONLY };
  const categories = value as Partial<OptionalConsent>;
  return {
    preferences: categories.preferences === true,
    externalMedia: categories.externalMedia === true,
  };
}

export function parseConsentRecord(value: string | null, now = Date.now()): ConsentRecord | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    const record = JSON.parse(decoded) as Partial<ConsentRecord>;
    const timestamp = Date.parse(String(record.timestamp || ""));
    const expiry = Date.parse(String(record.expiry || ""));
    if (
      record.version !== CONSENT_VERSION
      || !Number.isFinite(timestamp)
      || !Number.isFinite(expiry)
      || timestamp > now + 5 * 60 * 1000
      || expiry <= now
      || expiry <= timestamp
      || expiry - timestamp > CONSENT_LIFETIME_MS + 5 * 60 * 1000
      || !record.categories
      || typeof record.categories.preferences !== "boolean"
      || typeof record.categories.externalMedia !== "boolean"
    ) return null;
    return {
      version: CONSENT_VERSION,
      timestamp: new Date(timestamp).toISOString(),
      expiry: new Date(expiry).toISOString(),
      categories: normalizeCategories(record.categories),
    };
  } catch {
    return null;
  }
}

export function readConsentCookie(now = Date.now()): ConsentRecord | null {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return parseConsentRecord(match ? match.slice(prefix.length) : null, now);
}

export function writeConsentCookie(categories: OptionalConsent, now = Date.now()): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date(now).toISOString(),
    expiry: new Date(now + CONSENT_LIFETIME_MS).toISOString(),
    categories: normalizeCategories(categories),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=${Math.floor(CONSENT_LIFETIME_MS / 1000)}; SameSite=Lax${secure}`;
  return record;
}

export function clearOwnedOptionalStorage() {
  for (const key of OPTIONAL_STORAGE_KEYS) {
    try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
}
