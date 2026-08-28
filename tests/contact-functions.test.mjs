import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/contact.js";

const env = {
  THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev",
  THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev",
  THIRDRAILIFY_COMMUNITY_API_SECRET: "contact-signing-fixture",
  THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "contact-rate-fixture",
};

test("Public contact proxy forwards only a bounded JSON request to the configured Admin authority", async () => {
  let forwarded;
  const body = JSON.stringify({ name: "Viewer", message: "A valid contact fixture." });
  const response = await onRequest({ request: publicRequest(body), env, data: { contactFetch: async (url, init) => { forwarded = { url, init }; return Response.json({ ok: true, message: "Your message has been sent to Third Railify." }); } } });
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, "https://thirdrailify-admin.pages.dev/api/contact");
  assert.equal(forwarded.init.method, "POST");
  assert.equal(forwarded.init.headers.Origin, "https://thirdrailify.pages.dev");
  assert.match(forwarded.init.headers["X-ThirdRailify-Contact-Rate-Key"], /^[A-Za-z0-9_-]{43}$/);
  assert.match(forwarded.init.headers["X-ThirdRailify-Signature"], /^[A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(JSON.stringify(forwarded.init.headers), /203\.0\.113\.9/);
  assert.equal(forwarded.init.body, body);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("Public contact proxy rejects cross-origin, non-JSON, oversized, and non-POST requests", async () => {
  assert.equal((await onRequest({ request: publicRequest("{}", "https://attacker.example"), env })).status, 403);
  assert.equal((await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/contact", { method: "POST", headers: { Origin: "https://thirdrailify.pages.dev", "Content-Type": "text/plain" }, body: "fixture" }), env })).status, 415);
  assert.equal((await onRequest({ request: publicRequest("x".repeat(13 * 1024)), env })).status, 413);
  assert.equal((await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/contact", { method: "GET", headers: { Origin: "https://thirdrailify.pages.dev" } }), env })).status, 405);
  assert.equal((await onRequest({ request: publicRequest("{}"), env: { ...env, THIRDRAILIFY_ADMIN_ORIGIN: "http://admin.example" } })).status, 503);
  assert.equal((await onRequest({ request: publicRequest("{}"), env: { ...env, THIRDRAILIFY_COMMUNITY_API_SECRET: "" } })).status, 503);
});

test("Public contact proxy rejects a non-JSON authority response", async () => {
  const response = await onRequest({ request: publicRequest("{}"), env, data: { contactFetch: async () => new Response("not json", { status: 502, headers: { "Content-Type": "text/plain" } }) } });
  assert.equal(response.status, 502);
});

function publicRequest(body, origin = "https://thirdrailify.pages.dev") {
  return new Request("https://thirdrailify.pages.dev/api/contact", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.9" }, body });
}
