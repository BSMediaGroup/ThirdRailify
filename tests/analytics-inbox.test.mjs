import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  automated,
  device,
  MAX_BODY_BYTES,
  normalizePath,
  onRequest,
  privacyOptOut,
} from "../functions/api/analytics.js";

const env = {
  THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev",
  THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev",
  THIRDRAILIFY_ANALYTICS_INGEST_SECRET: "analytics-fixture",
};
test("public analytics relay is same-origin, bounded, secret-backed, and forwards trusted coarse metadata only", async () => {
  let forwarded;
  const request = analyticsRequest({
    id: "event_1234567890abcdef",
    eventType: "page_view",
    path: "/watch?unsafe=1",
    referrerHost: "https://google.com/search",
  });
  Object.defineProperty(request, "cf", {
    value: {
      country: "AU",
      region: "New South Wales",
      regionCode: "NSW",
      city: "Sydney",
      latitude: "-33.8688",
      longitude: "151.2093",
    },
  });
  const waits = [];
  const response = await onRequest({
    request,
    env,
    waitUntil: (promise) => waits.push(promise),
    data: {
      analyticsFetch: async (url, init) => {
        forwarded = { url, init };
        return Response.json({ ok: true, accepted: true });
      },
    },
  });
  await Promise.all(waits);
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.equal(
    forwarded.url,
    "https://thirdrailify-admin.pages.dev/api/internal/analytics/ingest",
  );
  const payload = JSON.parse(forwarded.init.body);
  assert.equal(payload.path, "/watch");
  assert.equal(payload.countryCode, "AU");
  assert.equal(payload.latitude, -33.9);
  assert.equal(payload.visitorClass, "guest");
  assert.equal("ip" in payload, false);
  assert.match(
    forwarded.init.headers["X-ThirdRailify-Signature"],
    /^[A-Za-z0-9_-]{43}$/,
  );
});
test("collector fails quietly for opt-out, invalid origin, oversized, and absent configuration", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return Response.json({ ok: true });
  };
  assert.equal(
    (
      await onRequest({
        request: analyticsRequest({}, "https://attacker.example"),
        env,
        data: { analyticsFetch: fetcher },
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await onRequest({
        request: analyticsRequest({}, undefined, { "Sec-GPC": "1" }),
        env,
        data: { analyticsFetch: fetcher },
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await onRequest({
        request: analyticsRequest({ padding: "x".repeat(MAX_BODY_BYTES + 1) }),
        env,
        data: { analyticsFetch: fetcher },
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await onRequest({
        request: analyticsRequest(),
        env: { ...env, THIRDRAILIFY_ANALYTICS_INGEST_SECRET: "" },
        data: { analyticsFetch: fetcher },
      })
    ).status,
    204,
  );
  assert.equal(calls, 0);
});
test("path, privacy, device, route and UI source contracts exclude APIs and deduplicate SPA collection", () => {
  assert.equal(normalizePath("/shop/rail?secret=1#part"), "/shop/rail");
  assert.throws(() => normalizePath("/api/orders"));
  assert.equal(
    device("Mozilla/5.0 (iPhone) AppleWebKit Safari/605.1").deviceClass,
    "mobile",
  );
  assert.equal(
    privacyOptOut(
      new Request("https://example.test", { headers: { DNT: "1" } }),
    ),
    true,
  );
  assert.equal(
    automated(
      new Request("https://example.test", { headers: { "User-Agent": "Googlebot/2.1" } }),
    ),
    true,
  );
  const source = readFileSync(
    new URL("../src/analytics/AnalyticsCollector.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /lastPath === key/);
  assert.match(source, /globalPrivacyControl/);
  assert.match(source, /sendBeacon/);
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /account\/messages/);
  const inbox = readFileSync(
    new URL("../src/account/AccountInbox.tsx", import.meta.url),
    "utf8",
  );
  assert.match(inbox, /role="dialog"/);
  assert.match(inbox, /Mark unread/);
  assert.match(inbox, /Delete/);
});
function analyticsRequest(
  body = {
    id: "event_1234567890abcdef",
    eventType: "page_view",
    path: "/",
    referrerHost: null,
  },
  origin = "https://thirdrailify.pages.dev",
  headers = {},
) {
  return new Request("https://thirdrailify.pages.dev/api/analytics", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
