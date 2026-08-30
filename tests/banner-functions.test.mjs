import assert from "node:assert/strict";
import test from "node:test";

import { normalizePublicBanner, onRequestGet } from "../functions/api/catalogue/banner.js";

const payload = {
  ok: true,
  schema: "thirdrailify-banner-v1",
  normal: { enabled: true, dismissible: true, messages: [{ text: "Site announcement", ctaLabel: "Watch", href: "/watch", newTab: false }], mode: "static", speed: "normal" },
  live: { enabled: true, label: "LIVE NOW", showTitle: true, supportingText: null, ctaLabel: "WATCH NOW", ctaPath: "/watch/live", animation: "pulse-sweep", intensity: "normal" },
  homeRail: { enabled: true, items: ["THIRD RAILIFY", "NEWS HANGOUT"], mode: "marquee", speed: "fast", easing: "ease-in-out", glyph: "zap", glyphSize: "large" },
  updatedAt: "2026-08-28T00:00:00.000Z",
};

test("Public banner projection proxy uses bounded normal Pages fetch semantics", async () => {
  let captured;
  const response = await onRequestGet({
    env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" },
    data: { fetchImpl: async (input, init) => { captured = { input: String(input), init }; return Response.json(payload); } },
  });
  assert.equal(response.status, 200);
  assert.equal(captured.input, "https://thirdrailify-admin.pages.dev/api/banner");
  assert.equal("redirect" in captured.init, false, "cross-Pages fetch must not use redirect:error");
  assert.ok(captured.init.signal);
  assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
  assert.deepEqual(await response.json(), payload);
});

test("Public banner projection fails soft on invalid or unavailable Admin configuration", async () => {
  assert.throws(() => normalizePublicBanner({ ...payload, privilegedMutation: true }), /banner_fields_invalid/);
  for (const fetchImpl of [async () => Response.json({ ok: false }, { status: 503 }), async () => Response.json({ nope: true }), async () => { throw new Error("offline"); }]) {
    const response = await onRequestGet({ env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, data: { fetchImpl } });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: "banner_unavailable" });
  }
});

test("Public banner projection supplies the managed rail default during a staggered Admin deploy", () => {
  const legacyPayload = { ...payload };
  delete legacyPayload.homeRail;
  assert.deepEqual(normalizePublicBanner(legacyPayload).homeRail, {
    enabled: true,
    items: ["THIRD RAILIFY", "NEWS HANGOUT", "ABOOT NOTHING", "POP CULTURE BEAT DOWN"],
    mode: "marquee",
    speed: "normal",
    easing: "linear",
    glyph: "zap",
    glyphSize: "medium",
  });
});

test("Public banner projection supplies safe option defaults during staggered releases", () => {
  const legacyPayload = { ...payload, normal: { ...payload.normal }, homeRail: { ...payload.homeRail } };
  delete legacyPayload.normal.dismissible;
  delete legacyPayload.homeRail.glyphSize;
  const normalized = normalizePublicBanner(legacyPayload);
  assert.equal(normalized.normal.dismissible, false);
  assert.equal(normalized.homeRail.glyphSize, "medium");
});
