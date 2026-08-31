import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { onRequest, proxyMediaUpload, proxyRead } from "../functions/api/wheels/[[path]].js";

test("anonymous wheel reads proxy only to the Admin authority and preserve the public projection", async () => {
  let seen; const fetchImpl = async (input, init) => { seen = { input: String(input), init }; return Response.json({ ok: true, items: [], count: 0 }, { headers: { "Cache-Control": "public, max-age=30" } }); };
  const response = await proxyRead(new Request("https://thirdrailify.pages.dev/api/wheels?sort=title"), { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, "", fetchImpl);
  assert.equal(response.status, 200); assert.equal(seen.input, "https://thirdrailify-admin.pages.dev/api/wheels?sort=title"); assert.equal(seen.init.method, "GET"); assert.deepEqual(await response.json(), { ok: true, items: [], count: 0 });
});

test("global mechanics uses one cacheable Public-safe Admin projection", async () => {
  let calls = 0; let seen; const mechanics = { mechanicsVersion: 1, curveProfile: "broadcast-smooth", customCurve: { holdEnd: .04, tailStart: .66, tailVelocity: .12 }, launchRpsMin: 2.8, launchRpsMax: 4.5, minimumFullTurns: 2, maximumFullTurns: 120, defaultSpinDurationMs: 6500, minimumSpinDurationMs: 2000, maximumSpinDurationMs: 60000 };
  const response = await proxyRead(new Request("https://thirdrailify.com/api/wheels/mechanics"), { THIRDRAILIFY_ADMIN_ORIGIN: "https://admin.thirdrailify.com" }, "mechanics", async (input, init) => { calls += 1; seen = { input: String(input), init }; return Response.json({ ok: true, mechanics, revision: 9 }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } }); });
  assert.equal(calls, 1); assert.equal(seen.input, "https://admin.thirdrailify.com/api/wheels/mechanics"); assert.equal(seen.init.method, "GET"); assert.match(response.headers.get("cache-control"), /s-maxage=120/); assert.deepEqual(await response.json(), { ok: true, mechanics, revision: 9 });
});

test("public Stage discovery stays a read-only Admin projection with segment-safe paths", async () => {
  const seen = []; const fetchImpl = async (input, init) => { seen.push({ input: String(input), init }); return Response.json({ ok: true, items: [], count: 0 }); };
  const env = { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" };
  await proxyRead(new Request("https://thirdrailify.pages.dev/api/wheels/stages?view=public&search=raid"), env, "stages", fetchImpl);
  await proxyRead(new Request("https://thirdrailify.pages.dev/api/wheels/stages/night-show"), env, "stages/night-show", fetchImpl);
  assert.equal(seen[0].input, "https://thirdrailify-admin.pages.dev/api/wheels/stages?view=public&search=raid");
  assert.equal(seen[1].input, "https://thirdrailify-admin.pages.dev/api/wheels/stages/night-show");
  assert.equal(seen.every((item) => item.init.method === "GET"), true);
});

test("unauthenticated Stage writes fail as bounded JSON instead of an unhandled edge exception", async () => {
  const response = await onRequest({ request: new Request("http://127.0.0.1/api/wheels/stages", { method: "POST", headers: { Origin: "http://127.0.0.1", "Content-Type": "application/json" }, body: "{}" }), env: { THIRDRAILIFY_PUBLIC_ORIGIN: "http://127.0.0.1" }, data: {} });
  assert.equal(response.status, 401); assert.deepEqual(await response.json(), { ok: false, error: "authentication_required", message: "Sign in to manage or officially spin a wheel." });
});

test("Public has no commerce or Wheels D1 binding and the wheel gateway never trusts browser account fields", async () => {
  const wrangler = JSON.parse((await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")).replace(/^\s*\/\/.*$/gm, ""));
  assert.deepEqual(wrangler.d1_databases.map((item) => item.binding), ["THIRDRAILIFY_AUTH_DB"]);
  assert.deepEqual(wrangler.r2_buckets || [], []);
  const routes = JSON.parse(await readFile(new URL("../public/_routes.json", import.meta.url), "utf8")); for (const route of ["/wheel", "/wheels", "/wheels/*"]) assert.equal(routes.exclude.includes(route), false);
  const source = await readFile(new URL("../functions/api/wheels/[[path]].js", import.meta.url), "utf8"); assert.doesNotMatch(source, /THIRDRAILIFY_COMMERCE_DB/); assert.match(source, /session\.accountId/); assert.match(source, /requireCsrf/); assert.doesNotMatch(source, /redirect:\s*["']error/);
});

test("wheel media upload relays bounded raw bytes with a server-only signature and exposes no object key", async () => {
  const bytes = Uint8Array.from([0x89,0x50,0x4e,0x47]); let seen;
  const response = await proxyMediaUpload(new Request("https://thirdrailify.pages.dev/api/wheels/demo-wheel/media/centre", { method: "POST", headers: { "Content-Type": "image/png" }, body: bytes }), { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev", THIRDRAILIFY_COMMUNITY_API_SECRET: "shared-test-secret" }, async (input, init) => { seen = { input: String(input), init }; return Response.json({ ok: true, asset: { id: "asset-safe-id", url: "/api/wheels/media/asset-safe-id" } }); }, "demo-wheel/media/centre", "creator-account");
  assert.equal(response.status, 200); assert.equal(seen.input, "https://thirdrailify-admin.pages.dev/api/wheels/internal/demo-wheel/media/centre"); assert.equal(seen.init.headers.get("x-thirdrailify-account-id"), "creator-account"); assert.match(seen.init.headers.get("x-thirdrailify-signature"), /^[A-Za-z0-9_-]{43}$/); assert.deepEqual(new Uint8Array(seen.init.body), bytes); assert.equal(JSON.stringify(await response.json()).includes("object_key"), false);
});
