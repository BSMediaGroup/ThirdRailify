import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/address/localities.js";

const feature = (overrides = {}) => ({ properties: { type: "district", osm_key: "place", name: "Woolloomooloo", city: "Sydney", state: "New South Wales", countrycode: "AU", ...overrides }, geometry: { coordinates: [151, -33] } });
const request = (search, fetchImpl, method = "GET") => onRequest({ request: new Request(`https://example.test/api/address/localities?${search}`, { method }), data: { localityFetch: fetchImpl } });

test("locality search filters country and non-place results, preserves suburbs, and excludes private fields", async () => {
  const response = await request("q=Woolloo&country=AU&region=New+South+Wales&address1=private&email=private", async (url, init) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get("countrycode"), "AU");
    assert.equal(params.get("q"), "Woolloo, New South Wales");
    assert.deepEqual(params.getAll("layer"), ["city", "district", "locality"]);
    assert.equal(params.has("email"), false); assert.equal(params.has("address1"), false);
    assert.deepEqual(init.headers, { Accept: "application/json" });
    return Response.json({ features: [feature(), feature(), feature({ countrycode: "US" }), feature({ type: "street" }), feature({ type: "locality", osm_key: "landuse", name: "Woolloomooloo Dept" })] });
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, results: [{ city: "Woolloomooloo", region: "New South Wales", countryCode: "AU" }] });
});

test("invalid or short queries never call the provider", async () => {
  const fetchImpl = () => { throw new Error("must not call"); };
  assert.equal((await request("q=Wo&country=AU", fetchImpl)).status, 200);
  assert.equal((await request("q=Hello&country=Australia", fetchImpl)).status, 400);
  assert.equal((await request(`q=${"x".repeat(121)}&country=AU`, fetchImpl)).status, 400);
  assert.equal((await request("q=Hello&country=AU", fetchImpl, "POST")).status, 405);
});

test("provider failure or malformed data allows the client to fall back to free text", async () => {
  for (const fetchImpl of [async () => { throw new Error("offline"); }, async () => new Response("bad", { status: 429 }), async () => Response.json({ unexpected: true })]) {
    const response = await request("q=London&country=CA", fetchImpl);
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /still enter/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
