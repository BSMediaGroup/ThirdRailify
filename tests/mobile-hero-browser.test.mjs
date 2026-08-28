import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:44219";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = path.join(tmpdir(), "thirdrailify-mobile-hero-browser");
const EPISODE_ID = `ep_${"a".repeat(64)}`;
const ROUTES = [
  "/", "/shop", "/shop/bleh-tee", "/checkout/success", "/cart",
  "/watch", "/watch/live", "/watch/episodes", `/watch/v/${EPISODE_ID}`,
  "/account", "/shawn", "/gina", "/about", "/friends", "/community",
  "/vip", "/donate", "/gift-cards", "/policies", "/terms", "/privacy",
  "/refunds", "/accessibility", "/goats", "/goats/submit", "/goats/mobile-goat",
  "/missing-route",
];
const VISUAL_ROUTES = new Map([
  ["/", "home"], ["/shop", "shop"], ["/watch", "watch"],
  ["/watch/episodes", "episodes"], ["/community", "community"],
  ["/donate", "donate"], ["/policies", "policies"], ["/goats", "goats"],
]);

test("every Public page keeps mobile hero lines separated and clear of its eyebrow", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44219"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of [[768, 1024], [390, 844], [360, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
    const page = await context.newPage();
    await mockApis(page);

    for (const route of ROUTES) {
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
      const heading = page.locator("#main-content h1").first();
      await heading.waitFor({ state: "visible" });
      await page.evaluate(() => document.fonts.ready);
      const geometry = await heading.evaluate((element) => {
        const style = getComputedStyle(element);
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = Number.parseFloat(style.lineHeight);
        const lineRects = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let offset = 0; offset < (node.textContent?.length || 0); offset += 1) {
            if (!node.textContent?.[offset].trim()) continue;
            const range = document.createRange();
            range.setStart(node, offset); range.setEnd(node, offset + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) lineRects.push({ top: rect.top, bottom: rect.bottom });
          }
        }
        const lines = [];
        for (const rect of lineRects.sort((a, b) => a.top - b.top)) {
          const line = lines.find((entry) => Math.abs(entry.top - rect.top) < 2);
          if (line) line.bottom = Math.max(line.bottom, rect.bottom);
          else lines.push({ ...rect });
        }
        const eyebrow = element.previousElementSibling?.classList.contains("eyebrow") ? element.previousElementSibling.getBoundingClientRect() : null;
        const headingRect = element.getBoundingClientRect();
        return {
          font: style.fontFamily,
          fontSize,
          ratio: lineHeight / fontSize,
          lineAdvance: lines.length > 1 ? Math.min(...lines.slice(1).map((line, index) => line.top - lines[index].top)) : null,
          eyebrowGap: eyebrow ? headingRect.top - eyebrow.bottom : null,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      assert.match(geometry.font, /American Captain/, `${route} loads the display font at ${width}px`);
      assert.ok(geometry.ratio >= 1.06, `${route} uses non-clipping mobile leading at ${width}px: ${geometry.ratio}`);
      if (geometry.lineAdvance !== null) assert.ok(geometry.lineAdvance / geometry.fontSize >= 1.06, `${route} has safe headline row progression at ${width}px: ${geometry.lineAdvance}px for ${geometry.fontSize}px type`);
      if (geometry.eyebrowGap !== null) assert.ok(geometry.eyebrowGap >= 8, `${route} clears its eyebrow at ${width}px: ${geometry.eyebrowGap}px`);
      assert.equal(geometry.overflow, false, `${route} has no horizontal overflow at ${width}px`);
      if (width === 390 && process.env.MOBILE_HERO_SCREENSHOTS === "1" && VISUAL_ROUTES.has(route)) {
        await page.screenshot({ path: path.join(RESULTS, `${VISUAL_ROUTES.get(route)}-${width}x${height}.png`), fullPage: false });
      }
    }
    await context.close();
  }
});

async function mockApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [], summary: { slotCount: 24, visibleCount: 0, placeholderCount: 24 } });
    if (pathname.startsWith("/api/watch/episodes/")) return json(route, episodeDetail());
    if (pathname === "/api/commerce/catalogue") return json(route, catalogue());
    if (pathname === "/api/commerce/products/bleh-tee") return json(route, { ok: true, source: "commerce-d1", product: catalogue().products[0] });
    if (pathname === "/api/community/discord") return json(route, { available: false, schema: "thirdrailify-discord-community-v1", freshness: "unavailable", generatedAt: null, ageSeconds: null, guild: null, counts: { onlineMembers: 0 }, channels: [], voiceSpaces: [], members: [] });
    if (pathname === "/api/goats/listings") return json(route, { ok: true, items: [], page: 1, pageSize: 12, total: 0, stats: { listings: 0, countries: 0, products: 0 }, facets: { countries: [] } });
    if (pathname === "/api/goats/map") return json(route, { type: "FeatureCollection", features: [] });
    if (pathname === "/api/goats/config") return json(route, { ok: true, submissionEnabled: true, captchaConfigured: false, geocoderConfigured: false, consentVersion: "goats-v2-2026-08", turnstileSiteKey: null, engagement: { comments: "disabled", reactions: "disabled" }, limits: { maxImageBytes: 10_485_760, maxGalleryImages: 5 } });
    if (pathname === "/api/goats/products") return json(route, { ok: true, products: [] });
    if (pathname === "/api/goats/listings/mobile-goat/comments") return json(route, { ok: true, items: [], page: 1, pageSize: 20, total: 0 });
    if (pathname === "/api/goats/listings/mobile-goat") return json(route, { ok: true, item: goatListing() });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function catalogue() {
  const product = { id: "product-1", slug: "bleh-tee", title: "BLEH | Unisex classic tee", description: "A real responsive product-detail fixture.", images: [], categories: ["Apparel"], collectionSlugs: ["apparel"], tags: [], featured: true, featuredOrder: 10, displayOrder: 10, maxQuantity: 5, available: true, price: { minUnitAmount: 3050, maxUnitAmount: 3050, label: "CA$30.50" }, variants: [{ id: "variant-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3050, currency: "CAD", availability: "active" }] };
  return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [product] };
}
function episodeDetail() {
  const timestamp = "2026-08-29T00:00:00.000Z";
  return { schema: "thirdrailify-watch-episode-v1", item: { id: EPISODE_ID, archiveDate: timestamp, platform: "rumble", key: "rumble:v-mobile", contentId: "v-mobile", watchUrl: "https://rumble.com/v-mobile.html", embedUrl: null, title: "A deliberately long archived signal title", description: "Responsive fixture.", creatorName: "Third Railify", thumbnailUrl: null, providerState: "completed", presentationState: "archive", publishedAt: timestamp, scheduledStart: null, actualStart: null, actualEnd: timestamp, liveVerifiedAt: null, liveExpiresAt: null, viewerCount: null, observedAt: timestamp }, archive: { position: 1, visibleCount: 1, previous: null, next: null } };
}
function goatListing() {
  return { id: "goat-mobile", slug: "mobile-goat", displayName: "Extraordinary Mobile GOAT", description: "Responsive fixture.", rating: 5, publishedAt: "2026-08-29T00:00:00.000Z", product: { id: "product-1", slug: "bleh-tee", name: "BLEH tee", image: null }, location: { label: "Sydney, Australia", countryCode: "AU", latitude: -33.8688, longitude: 151.2093 }, media: { main: null, profile: null, gallery: [] }, engagement: { comments: "disabled", reactions: "disabled" }, counts: { likes: 0, dislikes: 0, comments: 0 }, currentReaction: 0, neighbours: { previous: null, next: null } };
}
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite mobile hero test server did not start."); }
