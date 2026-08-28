import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { boundedFetch, internalPathFor, isReadPath, onRequest } from "../functions/api/goats/[[path]].js";

test("public route precedence declares submit before dynamic slug and goatgate preserves query and hash", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(app.indexOf('path="/goats/submit"') < app.indexOf('path="/goats/:slug"'));
  assert.match(app, /LegacyGoatgateRedirect/); assert.match(app, /location\.search/); assert.match(app, /location\.hash/);
});

test("GOATS public proxy accepts only bounded same-origin paths and maps writes to fixed internal destinations", () => {
  assert.equal(isReadPath("listings/demo-goat"), true); assert.equal(isReadPath("listings/daniel-clancy"), true); assert.equal(isReadPath("listings/submit"), true); assert.equal(isReadPath("https://evil.test"), false); assert.equal(isReadPath("media/../../secret"), false);
  assert.equal(internalPathFor("drafts"), "internal/drafts"); assert.equal(internalPathFor("listings/demo-goat/reaction"), "internal/listings/demo-goat/reaction"); assert.throws(() => internalPathFor("proxy/https://evil.test"), /not found/);
});

test("GOATS read transport mirrors the proven Pages fetch pattern and forwards an empty Admin result", async () => {
  let captured;
  const upstream = { ok: true, items: [], page: 1, pageSize: 12, total: 0, stats: { listings: 0, countries: 0, products: 0 }, facets: { countries: [] } };
  const response = await onRequest({
    request: new Request("https://thirdrailify.pages.dev/api/goats/listings?page=2&pageSize=6&country=AU", { headers: { Accept: "application/json" } }),
    env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" },
    data: {
      goatsFetch: async (input, init) => {
        captured = { input: String(input), init };
        if (init.redirect === "error") throw new TypeError("Pages rejected redirect mode");
        return Response.json(upstream, { headers: { "Cache-Control": "public, max-age=60", ETag: 'W/"empty"' } });
      },
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), upstream);
  assert.equal(captured.input, "https://thirdrailify-admin.pages.dev/api/goats/listings?page=2&pageSize=6&country=AU");
  assert.equal(captured.init.method, "GET");
  assert.equal(captured.init.redirect, undefined);
  assert.ok(captured.init.signal instanceof AbortSignal);
  assert.equal(captured.init.headers.get("accept"), "application/json");
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  assert.equal(response.headers.get("etag"), 'W/"empty"');
});

test("GOATS read proxy preserves HEAD and safe upstream 4xx/5xx responses", async () => {
  let method;
  const head = await onRequest({
    request: new Request("https://thirdrailify.pages.dev/api/goats/config", { method: "HEAD" }),
    env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" },
    data: { goatsFetch: async (_input, init) => { method = init.method; return new Response(null, { status: 200, headers: { "Content-Type": "application/json", ETag: 'W/"config"' } }); } },
  });
  assert.equal(method, "HEAD"); assert.equal(head.status, 200); assert.equal(await head.text(), ""); assert.equal(head.headers.get("etag"), 'W/"config"');

  for (const status of [404, 503]) {
    const payload = { ok: false, error: status === 404 ? "not_found" : "service_unavailable", message: "Safe Admin response." };
    const response = await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/goats/listings/missing-goat"), env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, data: { goatsFetch: async () => Response.json(payload, { status }) } });
    assert.equal(response.status, status); assert.deepEqual(await response.json(), payload);
  }
});

test("GOATS read proxy rejects malformed Admin origins and forwards approved media headers", async () => {
  const malformed = await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/goats/listings"), env: { THIRDRAILIFY_ADMIN_ORIGIN: "javascript:alert(1)" }, data: { goatsFetch: async () => { throw new Error("must not fetch"); } } });
  assert.equal(malformed.status, 503); assert.equal((await malformed.json()).error, "community_api_not_configured");

  const mediaId = "10000000-0000-4000-8000-000000000001";
  const response = await onRequest({
    request: new Request(`https://thirdrailify.pages.dev/api/goats/media/${mediaId}`),
    env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" },
    data: { goatsFetch: async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png", "Content-Length": "4", ETag: '"media"', "Content-Security-Policy": "default-src 'none'", "Cross-Origin-Resource-Policy": "same-site" } }) },
  });
  assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/png"); assert.equal(response.headers.get("content-length"), "4"); assert.equal(response.headers.get("etag"), '"media"'); assert.equal(response.headers.get("cross-origin-resource-policy"), "same-site");
});

test("GOATS bounded transport aborts and returns only the generic unavailable error", async () => {
  await assert.rejects(
    boundedFetch((_input, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })), "https://thirdrailify-admin.pages.dev/api/goats/listings", { method: "GET" }, 5),
    (error) => error?.status === 503 && error?.code === "community_unavailable" && !String(error.message).includes("Abort"),
  );
});

test("guest draft proxy signs a fixed Admin request without exposing the server secret", async () => {
  let captured;
  const response = await onRequest({
    request: new Request("https://thirdrailify.pages.dev/api/goats/drafts", { method: "POST", headers: { Origin: "https://thirdrailify.pages.dev", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.2" }, body: JSON.stringify({ turnstileToken: "fixture", website: "" }) }),
    env: { THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev", THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev", THIRDRAILIFY_COMMUNITY_API_SECRET: "server-only", THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "rate-only" },
    data: { goatsFetch: async (input, init) => { captured = { input: String(input), init }; return Response.json({ ok: true, draftToken: "opaque", reference: "GOAT-TEST", expiresAt: "later" }); } },
  });
  assert.equal(response.status, 200); assert.equal(captured.input, "https://thirdrailify-admin.pages.dev/api/goats/internal/drafts"); assert.ok(captured.init.headers.get("x-thirdrailify-signature")); assert.equal(JSON.stringify(await response.json()).includes("server-only"), false);
  assert.equal(captured.init.redirect, undefined);
});

test("cross-origin submission fails before the Admin boundary", async () => {
  const response = await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/goats/drafts", { method: "POST", headers: { Origin: "https://evil.test", "Content-Type": "application/json" }, body: "{}" }), env: { THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev" }, data: {} });
  assert.equal(response.status, 403); assert.equal((await response.json()).error, "origin_not_allowed");
});

test("Admin outage and oversized upload fail with bounded public errors", async () => {
  const unavailable = await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/goats/listings"), env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, data: { goatsFetch: async () => { throw new Error("private upstream detail"); } } });
  assert.equal(unavailable.status, 503); assert.deepEqual(await unavailable.json(), { ok: false, error: "community_unavailable", message: "The GOATS service is temporarily unavailable." });
  const oversized = await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/goats/drafts/media", { method: "POST", headers: { Origin: "https://thirdrailify.pages.dev", "Content-Type": "image/png", "Content-Length": String(10 * 1024 * 1024 + 1) }, body: new Uint8Array(0) }), env: { THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev", THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev", THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "rate-secret", THIRDRAILIFY_COMMUNITY_API_SECRET: "api-secret" }, data: {} });
  assert.equal(oversized.status, 413); assert.equal((await oversized.json()).error, "image_too_large");
});

test("Leaflet implementation validates coordinates, renders branded DOM markers, and gates readiness on real raster tiles", async () => {
  const source = await readFile(new URL("../src/goats/GoatsMap.tsx", import.meta.url), "utf8");
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(source, /from "leaflet"/); assert.match(source, /leaflet\/dist\/leaflet\.css/); assert.match(source, /goatpin\.svg/); assert.match(source, /L\.marker/); assert.match(source, /marker\.on\("click"/); assert.match(source, /data-goats-map-state/); assert.match(source, /data-goats-map-engine="leaflet"/); assert.match(source, /data-goats-map-feature-count/); assert.match(source, /tileload/); assert.match(source, /successfulTiles < 1/); assert.match(source, /markers\.size !== features\.length/); assert.match(source, /getBoundingClientRect/); assert.match(source, /ResizeObserver/); assert.match(source, /invalidateSize/); assert.match(source, /map\.remove\(\)/); assert.match(source, /noWrap: true/); assert.match(source, /maxBounds: WORLD_BOUNDS/); assert.match(source, /Number\.isFinite/); assert.match(source, /longitude >= -180/); assert.match(source, /latitude >= -85\.05112878/); assert.match(source, /<MapFallback/); assert.doesNotMatch(source, /maplibre|map\.loadImage|<iframe|github|demotiles|mapbox.*token/i);
  assert.equal(packageJson.dependencies.leaflet, "1.9.4"); assert.equal(packageJson.dependencies["maplibre-gl"], undefined);
  assert.match(source, /tiles\.openfreemap\.org\/natural_earth\/ne2sr/); assert.match(headers, /img-src[^\n]+https:\/\/tiles\.openfreemap\.org/);
});

test("product CTA and submission query use canonical product IDs", async () => {
  const detail = await readFile(new URL("../src/pages/ProductDetailPage.tsx", import.meta.url), "utf8");
  const submit = await readFile(new URL("../src/pages/GoatSubmitPage.tsx", import.meta.url), "utf8");
  assert.match(detail, /product=\$\{encodeURIComponent\(product\.id\)\}/); assert.match(submit, /params\.get\("product"\)/); assert.match(submit, /nextProducts\.some\(\(product\) => product\.id === requested\)/);
});
