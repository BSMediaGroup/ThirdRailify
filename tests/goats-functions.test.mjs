import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { internalPathFor, isReadPath, onRequest } from "../functions/api/goats/[[path]].js";

test("public route precedence declares submit before dynamic slug and goatgate preserves query and hash", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(app.indexOf('path="/goats/submit"') < app.indexOf('path="/goats/:slug"'));
  assert.match(app, /LegacyGoatgateRedirect/); assert.match(app, /location\.search/); assert.match(app, /location\.hash/);
});

test("GOATS public proxy accepts only bounded same-origin paths and maps writes to fixed internal destinations", () => {
  assert.equal(isReadPath("listings/demo-goat"), true); assert.equal(isReadPath("listings/daniel-clancy"), true); assert.equal(isReadPath("listings/submit"), true); assert.equal(isReadPath("https://evil.test"), false); assert.equal(isReadPath("media/../../secret"), false);
  assert.equal(internalPathFor("drafts"), "internal/drafts"); assert.equal(internalPathFor("listings/demo-goat/reaction"), "internal/listings/demo-goat/reaction"); assert.throws(() => internalPathFor("proxy/https://evil.test"), /not found/);
});

test("guest draft proxy signs a fixed Admin request without exposing the server secret", async () => {
  let captured;
  const response = await onRequest({
    request: new Request("https://thirdrailify.pages.dev/api/goats/drafts", { method: "POST", headers: { Origin: "https://thirdrailify.pages.dev", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.2" }, body: JSON.stringify({ turnstileToken: "fixture", website: "" }) }),
    env: { THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev", THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev", THIRDRAILIFY_COMMUNITY_API_SECRET: "server-only", THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "rate-only" },
    data: { goatsFetch: async (input, init) => { captured = { input: String(input), init }; return Response.json({ ok: true, draftToken: "opaque", reference: "GOAT-TEST", expiresAt: "later" }); } },
  });
  assert.equal(response.status, 200); assert.equal(captured.input, "https://thirdrailify-admin.pages.dev/api/goats/internal/drafts"); assert.ok(captured.init.headers.get("x-thirdrailify-signature")); assert.equal(JSON.stringify(await response.json()).includes("server-only"), false);
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

test("MapLibre implementation clusters GeoJSON, disables world copies, and has no iframe or demo tile endpoint", async () => {
  const source = await readFile(new URL("../src/goats/GoatsMap.tsx", import.meta.url), "utf8");
  assert.match(source, /cluster: true/); assert.match(source, /renderWorldCopies: false/); assert.match(source, /getClusterExpansionZoom/); assert.match(source, /goatpin\.svg/); assert.match(source, /webGlSupported/); assert.match(source, /<MapFallback/); assert.doesNotMatch(source, /<iframe|demotiles|mapbox.*token/i);
});

test("product CTA and submission query use canonical product IDs", async () => {
  const detail = await readFile(new URL("../src/pages/ProductDetailPage.tsx", import.meta.url), "utf8");
  const submit = await readFile(new URL("../src/pages/GoatSubmitPage.tsx", import.meta.url), "utf8");
  assert.match(detail, /product=\$\{encodeURIComponent\(product\.id\)\}/); assert.match(submit, /params\.get\("product"\)/); assert.match(submit, /nextProducts\.some\(\(product\) => product\.id === requested\)/);
});
