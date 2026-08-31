import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { onRequest as seoMiddleware } from "../functions/_middleware.js";
import { onRequest as robotsRequest } from "../functions/robots.txt.js";
import { onRequest as sitemapRequest, renderSitemap } from "../functions/sitemap.xml.js";
import {
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  applySeoPresentationOverride,
  canonicalRedirectPath,
  episodeSeo,
  goatSeo,
  productSeo,
  renderSeoHead,
  staticSeoForPath,
  staticSitemapPaths,
  wheelSeo,
} from "../seo/site-seo.js";

const ORIGIN = "https://thirdrailify.pages.dev";

test("every Public route has deliberate SEO or a canonical edge redirect", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const paths = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]).filter((path) => path !== "*");
  const samples = new Map([
    ["/shop/:slug", "/shop/bleh-unisex-classic-tee"],
    ["/products/:category", "/products/apparel"],
    ["/products/:category/:slug", "/products/apparel/bleh-unisex-classic-tee"],
    ["/product-page/:slug", "/product-page/bleh-unisex-classic-tee"],
    ["/watch/v/:episodeId", `/watch/v/ep_${"a".repeat(64)}`],
    ["/goats/:slug", "/goats/demo-goat"],
    ["/polls/:slug", "/polls/demo-poll"],
    ["/polls/:slug/edit", "/polls/demo-poll/edit"],
    ["/polls/:slug/popout", "/polls/demo-poll/popout"],
    ["/wheels/:slug", "/wheels/demo-wheel"],
    ["/wheels/:slug/edit", "/wheels/demo-wheel/edit"],
    ["/wheels/:slug/present", "/wheels/demo-wheel/present"],
    ["/wheels/stages/:slug", "/wheels/stages/demo-stage"],
    ["/wheels/stages/:slug/edit", "/wheels/stages/demo-stage/edit"],
    ["/account/orders/:orderId", "/account/orders/ord_test"],
  ]);
  for (const declared of paths) {
    const path = samples.get(declared) || declared;
    const redirect = canonicalRedirectPath(path);
    const seo = staticSeoForPath(path, ORIGIN);
    assert.equal(Boolean(redirect) || seo.key !== "not-found", true, `${declared} has SEO or a canonical redirect`);
    assert.ok(seo.title.length >= 18 && seo.description.length >= 60, `${declared} has substantial metadata`);
  }
  const home = staticSeoForPath("/", ORIGIN);
  assert.equal(home.robots, INDEX_ROBOTS);
  assert.equal(home.jsonLd["@graph"].some((node) => node["@type"] === "WebSite"), true);
  assert.equal(home.jsonLd["@graph"].some((node) => node["@type"] === "PodcastSeries"), true);
});

test("static pages publish unique titles, descriptions, canonicals, social images, and crawl policy", () => {
  const paths = staticSitemapPaths();
  const documents = paths.map((path) => staticSeoForPath(path, ORIGIN));
  assert.equal(new Set(documents.map((document) => document.title)).size, documents.length);
  assert.equal(new Set(documents.map((document) => document.description)).size, documents.length);
  for (const document of documents) {
    assert.match(document.canonicalUrl, /^https:\/\/thirdrailify\.pages\.dev\//);
    assert.match(document.imageUrl, /^https:\/\//);
    assert.equal(document.robots, INDEX_ROBOTS);
    const head = renderSeoHead(document);
    for (const marker of ["og:title", "og:description", "og:image", "twitter:card", "twitter:image", 'rel="canonical"', "application/ld\\+json"]) assert.match(head, new RegExp(marker));
    assert.doesNotMatch(head, /noindex/);
  }
  for (const path of ["/account", "/account/profile", "/account/delivery", "/account/orders", "/account/orders/ord_test", "/account/messages", "/account/security", "/account/login", "/cart", "/checkout/success", "/goats/submit", "/live", "/wheels/new", "/wheels/demo-wheel/edit", "/wheels/demo-wheel/present", "/missing"]) assert.equal(staticSeoForPath(path, ORIGIN).robots, NOINDEX_ROBOTS);
});

test("dynamic product, episode, and GOATS metadata uses sanitized page authority", () => {
  const product = productSeo(productPayload().product, ORIGIN);
  assert.ok(product);
  assert.equal(product.title, "BLEH | Unisex Classic Tee | Third Railify Shop");
  assert.equal(product.imageUrl, "https://thirdrailify-admin.pages.dev/commerce-media/" + "a".repeat(64) + ".png");
  assert.equal(product.jsonLd["@graph"].some((node) => node["@type"] === "Product" && node.offers.lowPrice === "35.50"), true);

  const episode = episodeSeo({ item: { id: `ep_${"b".repeat(64)}`, title: "News Hangout 42", description: "Shawn and Gina take on the week's stories.", thumbnailUrl: "https://i.ytimg.com/vi/demo/maxresdefault.jpg", publishedAt: "2026-08-28T04:00:00.000Z", watchUrl: "https://www.youtube.com/watch?v=demo", embedUrl: "https://www.youtube-nocookie.com/embed/demo" } }, ORIGIN);
  assert.ok(episode);
  assert.equal(episode.pageType, "video.other");
  assert.equal(episode.jsonLd["@graph"].some((node) => node["@type"] === "VideoObject" && node.name === "News Hangout 42"), true);

  const goat = goatSeo({ slug: "daniel-clancy", displayName: "Daniel", description: "Taking the lore beyond the rail.", publishedAt: "2026-08-27T04:00:00.000Z", product: { name: "Third Railify Tee", image: null }, location: { label: "Sydney, Australia" }, media: { main: { url: "https://thirdrailify-admin.pages.dev/api/goats/media/11111111-1111-4111-8111-111111111111" }, profile: null } }, ORIGIN);
  assert.ok(goat);
  assert.match(goat.title, /Daniel/);
  assert.equal(goat.description, "Taking the lore beyond the rail.");
  assert.equal(goat.jsonLd["@graph"].some((node) => node["@type"] === "SocialMediaPosting" && node.contentLocation.name === "Sydney, Australia"), true);

  const wheel = wheelSeo(wheelPayload().wheel, ORIGIN);
  assert.ok(wheel);
  assert.equal(wheel.title, "Third Railify Demo Draw | Third Railify Wheels");
  assert.equal(wheel.canonicalUrl, `${ORIGIN}/wheels/third-railify-demo-draw`);
  assert.equal(wheel.jsonLd["@graph"].some((node) => node["@type"] === "WebApplication" && node.applicationCategory === "GameApplication"), true);
  const editor = wheelSeo(wheelPayload().wheel, ORIGIN, "edit");
  assert.equal(editor.robots, NOINDEX_ROBOTS);
  assert.equal(editor.canonicalUrl, wheel.canonicalUrl);
  assert.equal(wheelSeo({ ...wheelPayload().wheel, visibility: "hidden" }, ORIGIN).robots, NOINDEX_ROBOTS);
});

test("future Admin presentation overrides cannot change canonical, robots, key, or structured product truth", () => {
  const original = productSeo(productPayload().product, ORIGIN);
  const overridden = applySeoPresentationOverride(original, { title: "Editor social title", description: "A deliberately edited social description for this product page.", imageUrl: "https://cdn.example.test/social.png", imageAlt: "Edited card artwork", canonicalUrl: "https://evil.test/", robots: "noindex" });
  assert.equal(overridden.title, "Editor social title");
  assert.equal(overridden.imageUrl, "https://cdn.example.test/social.png");
  assert.equal(overridden.canonicalUrl, original.canonicalUrl);
  assert.equal(overridden.robots, original.robots);
  assert.equal(overridden.key, original.key);
  assert.equal(overridden.jsonLd["@graph"].find((node) => node["@type"] === "Product").name, "BLEH | Unisex Classic Tee");
  assert.doesNotMatch(renderSeoHead(applySeoPresentationOverride(original, { title: '<script>alert("x")</script>' })), /<title><script>/);
});

test("edge middleware gives social crawlers route-specific initial HTML and canonical redirects", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const staticResponse = await seoMiddleware(context("/watch", index));
  const staticHtml = await staticResponse.text();
  assert.equal(staticResponse.headers.get("x-robots-tag"), INDEX_ROBOTS);
  assert.equal(staticResponse.headers.get("link"), `<${ORIGIN}/watch>; rel="canonical"`);
  assert.match(staticHtml, /<title>Watch Third Railify Live &amp; On Demand<\/title>/);
  assert.match(staticHtml, /property="og:image"/);
  assert.match(staticHtml, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(staticHtml, /Third Railify is a daily podcast covering news, crime, pop culture, and the arguments in between/);

  const dynamicResponse = await seoMiddleware(context("/shop/bleh-unisex-classic-tee", index, { commerceFetch: async () => Response.json(productPayload()) }));
  const dynamicHtml = await dynamicResponse.text();
  assert.match(dynamicHtml, /BLEH \| Unisex Classic Tee \| Third Railify Shop/);
  assert.match(dynamicHtml, new RegExp(`${"a".repeat(64)}\\.png`));

  const privateResponse = await seoMiddleware(context("/account", index));
  assert.equal(privateResponse.headers.get("x-robots-tag"), NOINDEX_ROBOTS);
  assert.match(await privateResponse.text(), /<title>Your Account \| Third Railify<\/title>/);

  const previewResponse = await seoMiddleware(context("/watch", index, {}, "https://preview-build.thirdrailify.pages.dev"));
  assert.equal(previewResponse.headers.get("x-robots-tag"), NOINDEX_ROBOTS);
  assert.equal(previewResponse.headers.get("link"), `<${ORIGIN}/watch>; rel="canonical"`);

  const missingRoute = await seoMiddleware(context("/definitely-missing", index));
  assert.equal(missingRoute.status, 404);
  assert.equal(missingRoute.statusText, "Not Found");
  assert.equal(missingRoute.headers.get("x-robots-tag"), NOINDEX_ROBOTS);
  const missingProduct = await seoMiddleware(context("/shop/missing-product", index, { commerceFetch: async () => Response.json({ ok: false }, { status: 404 }) }));
  assert.equal(missingProduct.status, 404);
  assert.equal(missingProduct.headers.get("x-robots-tag"), NOINDEX_ROBOTS);

  const wheelResponse = await seoMiddleware(context("/wheels/third-railify-demo-draw", index, { wheelsFetch: async () => Response.json(wheelPayload()) }));
  assert.equal(wheelResponse.status, 200);
  assert.match(await wheelResponse.text(), /Third Railify Demo Draw \| Third Railify Wheels/);
  const missingWheel = await seoMiddleware(context("/wheels/missing-wheel", index, { wheelsFetch: async () => Response.json({ ok: false }, { status: 404 }) }));
  assert.equal(missingWheel.status, 404);
  assert.equal(missingWheel.headers.get("x-robots-tag"), NOINDEX_ROBOTS);

  const redirect = await seoMiddleware(context("/product-page/bleh-unisex-classic-tee?ref=old", index));
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), `${ORIGIN}/shop/bleh-unisex-classic-tee?ref=old`);
  const wheelRedirect = await seoMiddleware(context("/wheel?ref=old", index));
  assert.equal(wheelRedirect.status, 301);
  assert.equal(wheelRedirect.headers.get("location"), `${ORIGIN}/wheels?ref=old`);
});

test("robots and the dynamic sitemap expose canonical crawl discovery without indexing APIs", async () => {
  const robots = await robotsRequest({ request: new Request(`${ORIGIN}/robots.txt`), env: { THIRDRAILIFY_PUBLIC_ORIGIN: ORIGIN } });
  const robotsText = await robots.text();
  assert.match(robotsText, /Allow: \//);
  assert.match(robotsText, /Disallow: \/api\//);
  assert.match(robotsText, new RegExp(`Sitemap: ${ORIGIN.replaceAll("/", "\\/")}\\/sitemap\\.xml`));

  const response = await sitemapRequest({
    request: new Request(`${ORIGIN}/sitemap.xml`),
    env: { THIRDRAILIFY_PUBLIC_ORIGIN: ORIGIN },
    data: { seoSitemapData: { collections: [{ slug: "apparel", updatedAt: "2026-08-28" }], products: [productPayload().product], episodes: [{ id: `ep_${"b".repeat(64)}`, title: "Episode & test", archiveDate: "2026-08-27", thumbnailUrl: "https://i.ytimg.com/test.jpg" }], goats: [{ slug: "demo-goat", displayName: "Demo <Goat>", publishedAt: "2026-08-26", product: {}, media: {} }], wheels: [wheelPayload().wheel] } },
  });
  const xml = await response.text();
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  for (const url of ["/about", "/products/apparel", "/shop/bleh-unisex-classic-tee", `/watch/v/ep_${"b".repeat(64)}`, "/goats/demo-goat", "/wheels", "/wheels/third-railify-demo-draw"]) assert.match(xml, new RegExp(xmlEscape(`${ORIGIN}${url}`)));
  for (const excluded of ["/account", "/cart", "/checkout/success", "/goats/submit", "/product-page/"]) assert.doesNotMatch(xml, new RegExp(xmlEscape(`${ORIGIN}${excluded}`)));
  assert.match(xml, /Episode &amp; test/);
  assert.equal(renderSitemap(ORIGIN, [{ path: "/shop/item", image: "javascript:bad" }]).includes("javascript"), false);

  const routes = JSON.parse(await readFile(new URL("../public/_routes.json", import.meta.url), "utf8"));
  assert.deepEqual(routes.include, ["/*"]);
  assert.deepEqual(routes.exclude, ["/assets/*", "/social/*"]);
  assert.doesNotMatch(await readFile(new URL("../public/_headers", import.meta.url), "utf8"), /noindex|nofollow|noarchive/i);
});

function context(path, html, data = {}, requestOrigin = ORIGIN) {
  return {
    request: new Request(`${requestOrigin}${path}`, { headers: { Accept: "text/html", "User-Agent": "Discordbot/2.0" } }),
    env: { THIRDRAILIFY_PUBLIC_ORIGIN: ORIGIN, THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" },
    data,
    next: async () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"base"' } }),
  };
}

function productPayload() {
  return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, product: {
    id: "product-bleh", slug: "bleh-unisex-classic-tee", title: "BLEH | Unisex Classic Tee", description: "The official BLEH shirt from Third Railify, available in multiple public variants.",
    images: [`${ORIGIN.replace("thirdrailify.pages.dev", "thirdrailify-admin.pages.dev")}/commerce-media/${"a".repeat(64)}.png`], categories: ["Apparel"], collectionSlugs: ["apparel"], tags: ["Third Railify"], featured: true, featuredOrder: 10, displayOrder: 10, requiresShipping: true, maxQuantity: 20,
    price: { currency: "CAD", minUnitAmount: 3550, maxUnitAmount: 4200, label: "$35.50–$42.00" }, available: true, updatedAt: "2026-08-28T00:00:00.000Z",
    variants: [{ id: "variant-bleh", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3550, currency: "CAD", availability: "active" }],
  } };
}

function wheelPayload() {
  return { ok: true, wheel: { slug: "third-railify-demo-draw", title: "Third Railify Demo Draw", description: "A clearly synthetic staging wheel for visual and security acceptance.", lifecycle: "active", visibility: "public", participantCount: 8, weighted: true, entries: [], config: {}, media: { background: null, centre: null }, demoEnabled: true, officialEnabled: true, latestOfficialResult: null, recentOfficialResults: [] }, access: { role: null, isMasterAdmin: false, canEdit: false, canSpinOfficially: false, editingLocked: false, officialSpinLocked: false } };
}

function xmlEscape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "&amp;"); }
