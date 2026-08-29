import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";
import { episodeSeo, goatSeo, productSeo, staticSeoForPath, wheelSeo } from "../seo/site-seo.js";

const ORIGIN = "http://127.0.0.1:4196";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROUTES = [
  "/", "/about", "/shawn", "/gina", "/watch", "/watch/live", "/watch/episodes", "/shop", "/products/apparel",
  "/cart", "/checkout", "/checkout/success", "/community", "/friends", "/vip", "/donate", "/gift-cards", "/goats", "/goats/submit",
  "/wheels", "/wheels/new",
  "/policies", "/terms", "/privacy", "/refunds", "/accessibility", "/account", "/account/login", "/missing-route",
];

test("React navigation publishes complete route-specific SEO without duplicate head elements", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4196"], { stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += chunk; });
  server.stderr.on("data", (chunk) => { serverLog += chunk; });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/**", routeApi);

  for (const path of ROUTES) {
    const expected = staticSeoForPath(path, ORIGIN);
    await page.goto(`${ORIGIN}${path}`);
    await waitForHead(page, path, expected, pageErrors, serverLog);
    const head = await page.evaluate(() => ({
      title: document.title,
      description: [...document.querySelectorAll('meta[name="description"]')].map((node) => node.getAttribute("content")),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map((node) => node.getAttribute("content")),
      ogTitle: [...document.querySelectorAll('meta[property="og:title"]')].map((node) => node.getAttribute("content")),
      ogDescription: [...document.querySelectorAll('meta[property="og:description"]')].map((node) => node.getAttribute("content")),
      ogImage: [...document.querySelectorAll('meta[property="og:image"]')].map((node) => node.getAttribute("content")),
      twitterCard: [...document.querySelectorAll('meta[name="twitter:card"]')].map((node) => node.getAttribute("content")),
      canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((node) => node.getAttribute("href")),
      structured: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent || "null")),
    }));
    assert.equal(head.title, expected.title, `${path} title`);
    assert.deepEqual(head.description, [expected.description], `${path} description`);
    assert.deepEqual(head.robots, [expected.robots], `${path} robots`);
    assert.deepEqual(head.ogTitle, [expected.title], `${path} Open Graph title`);
    assert.deepEqual(head.ogDescription, [expected.description], `${path} Open Graph description`);
    assert.deepEqual(head.ogImage, [expected.imageUrl], `${path} Open Graph image`);
    assert.deepEqual(head.twitterCard, ["summary_large_image"], `${path} Twitter card`);
    assert.deepEqual(head.canonical, [expected.canonicalUrl], `${path} canonical`);
    assert.equal(head.structured.length, 1, `${path} has one JSON-LD graph`);
    assert.equal(Array.isArray(head.structured[0]?.["@graph"]), true, `${path} JSON-LD is valid`);
  }

  await page.goto(`${ORIGIN}/live`);
  await page.waitForURL(`${ORIGIN}/watch`);
  await waitForHead(page, "/watch", staticSeoForPath("/watch", ORIGIN), pageErrors, serverLog);

  const dynamic = [
    { path: "/shop/bleh-unisex-classic-tee", expected: productSeo(commerceProduct(), ORIGIN) },
    { path: `/watch/v/${episodeDetail().item.id}`, expected: episodeSeo(episodeDetail(), ORIGIN) },
    { path: "/goats/demo-goat", expected: goatSeo(goatListing(), ORIGIN) },
    { path: "/wheels/third-railify-demo-draw", expected: wheelSeo(wheelPayload().wheel, ORIGIN) },
    { path: "/wheels/third-railify-demo-draw/present", expected: wheelSeo(wheelPayload().wheel, ORIGIN, "present") },
  ];
  for (const { path, expected } of dynamic) {
    assert.ok(expected);
    await page.goto(`${ORIGIN}${path}`);
    await waitForHead(page, path, expected, pageErrors, serverLog);
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute("content"), expected.title);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), expected.imageUrl);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), expected.canonicalUrl);
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
  }

  await page.goto(`${ORIGIN}/missing-route`);
  await waitForHead(page, "/missing-route", staticSeoForPath("/missing-route", ORIGIN), pageErrors, serverLog);
  await page.locator('a[href="/wheels"]').first().evaluate((element) => element.click());
  await waitForHead(page, "/wheels", staticSeoForPath("/wheels", ORIGIN), pageErrors, serverLog);
  assert.notEqual(await page.title(), "Page Not Found | Third Railify");
});

async function routeApi(route) {
  const path = new URL(route.request().url()).pathname;
  if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
  if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
  if (path === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, updatedAt: "2026-08-29T00:00:00.000Z" });
  if (path === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [commerceProduct()] });
  if (path === "/api/commerce/products/bleh-unisex-classic-tee") return json(route, { ok: true, source: "commerce-d1", product: commerceProduct() });
  if (path === "/api/goats/listings") return json(route, { ok: true, items: [], page: 1, pageSize: 12, total: 0, stats: { listings: 0, countries: 0, products: 0 }, facets: { countries: [] } });
  if (path === "/api/goats/map") return json(route, { type: "FeatureCollection", features: [] });
  if (path === "/api/goats/products") return json(route, { ok: true, items: [] });
  if (path === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [], summary: { slotCount: 24, visibleCount: 0, placeholderCount: 24 } });
  if (path === `/api/watch/episodes/${episodeDetail().item.id}`) return json(route, episodeDetail());
  if (path === "/api/goats/listings/demo-goat") return json(route, { ok: true, item: goatListing() });
  if (path === "/api/goats/listings/demo-goat/comments") return json(route, { ok: true, items: [], page: 1, pageSize: 20, total: 0 });
  if (path === "/api/wheels") return json(route, { ok: true, items: [wheelPayload().wheel], count: 1 });
  if (path === "/api/wheels/third-railify-demo-draw") return json(route, wheelPayload());
  return json(route, { ok: false, error: "fixture_unavailable" }, 503);
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { const response = await fetch(ORIGIN); if (response.ok) return; } catch { /* retry */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("SEO browser fixture did not start"); }
async function waitForHead(page, path, expected, pageErrors, serverLog) {
  try {
    await page.waitForFunction(({ title, canonical }) => document.title === title && document.querySelector('link[rel="canonical"]')?.href === canonical, { title: expected.title, canonical: expected.canonicalUrl });
  } catch (error) {
    const actual = await page.evaluate(() => ({ title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href || "" }));
    throw new Error(`${path} SEO head did not settle: ${error.message}; actual=${JSON.stringify(actual)}; pageErrors=${JSON.stringify(pageErrors)}; server=${serverLog.slice(-2000)}`);
  }
}

function commerceProduct() {
  return { id: "product-bleh", slug: "bleh-unisex-classic-tee", title: "BLEH | Unisex Classic Tee", name: "BLEH | Unisex Classic Tee", description: "The official BLEH shirt from Third Railify, available in multiple public variants.", images: ["https://thirdrailify-admin.pages.dev/commerce-media/" + "a".repeat(64) + ".png"], image: "https://thirdrailify-admin.pages.dev/commerce-media/" + "a".repeat(64) + ".png", categories: ["Apparel"], collectionSlugs: ["apparel"], tags: ["Third Railify"], featured: true, featuredOrder: 10, displayOrder: 10, maxQuantity: 20, available: true, priceMinUnitAmount: 3550, priceMaxUnitAmount: 4200, price: { minUnitAmount: 3550, maxUnitAmount: 4200, label: "$35.50–$42.00" }, variants: [{ id: "variant-bleh", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3550, currency: "CAD", availability: "active" }] };
}
function episodeDetail() {
  const timestamp = "2026-08-28T04:00:00.000Z";
  return { schema: "thirdrailify-watch-episode-v1", item: { id: `ep_${"b".repeat(64)}`, archiveDate: timestamp, platform: "youtube", key: "youtube:demo1234567", contentId: "demo1234567", watchUrl: "https://www.youtube.com/watch?v=demo1234567", embedUrl: "https://www.youtube-nocookie.com/embed/demo1234567", title: "News Hangout 42", description: "Shawn and Gina take on the week's stories.", creatorName: "Third Railify", thumbnailUrl: "https://i.ytimg.com/vi/demo1234567/maxresdefault.jpg", providerState: "completed", presentationState: "archive", publishedAt: timestamp, scheduledStart: null, actualStart: null, actualEnd: timestamp, liveVerifiedAt: null, liveExpiresAt: null, viewerCount: null, observedAt: timestamp }, archive: { position: 1, visibleCount: 1, previous: null, next: null } };
}
function goatListing() {
  return { id: "goat-demo", slug: "demo-goat", displayName: "Demo GOAT", description: "Taking the lore beyond the rail.", rating: 5, publishedAt: "2026-08-27T04:00:00.000Z", product: { id: "product-bleh", slug: "bleh-unisex-classic-tee", name: "BLEH tee", image: null }, location: { label: "Sydney, Australia", countryCode: "AU", latitude: -33.8688, longitude: 151.2093 }, media: { main: { id: "11111111-1111-4111-8111-111111111111", role: "main", sortOrder: 0, url: "https://thirdrailify-admin.pages.dev/api/goats/media/11111111-1111-4111-8111-111111111111" }, profile: null, gallery: [] }, engagement: { comments: "auto", reactions: "auto" }, counts: { likes: 1, dislikes: 0, comments: 0 }, currentReaction: 0, neighbours: { previous: null, next: null } };
}
function wheelPayload() {
  return { ok: true, wheel: { slug: "third-railify-demo-draw", title: "Third Railify Demo Draw", description: "A clearly synthetic staging wheel for visual and security acceptance.", lifecycle: "active", visibility: "public", participantCount: 8, weighted: true, entries: [], config: { themePreset: "third-rail-gold", palette: ["#f3c928", "#b8182f"], pointerAccent: "#f3c928", centreTreatment: "bolt", backgroundIntensity: "medium", labelContrast: "light", spinDurationMs: 6000, tickingSoundEnabled: false, winnerSoundEnabled: false, celebrationEnabled: false, confettiEnabled: false, winnerLightingEnabled: false, celebrationIntensity: "normal", backgroundEnabled: false, backgroundFocalX: 50, backgroundFocalY: 50, backgroundImageOpacity: 1, backgroundOverlayIntensity: 0.5, winnerMessageTemplate: "{winner}", publicHistoryVisible: false }, media: { background: null, centre: null }, demoEnabled: true, officialEnabled: true, latestOfficialResult: null, recentOfficialResults: [] }, access: { role: null, isMasterAdmin: false, canEdit: false, canSpinOfficially: false, editingLocked: false, officialSpinLocked: false } };
}
