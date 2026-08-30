import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequest } from "../functions/_middleware.js";

const env = { THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.com", THIRDRAILIFY_DOMAIN_CUTOVER_ACTIVE: "true" };

function context(url, method = "GET", overrides = env) {
  return { request: new Request(url, { method }), env: overrides, next: async () => new Response("next", { headers: { "Content-Type": "text/plain" } }) };
}

test("www and Public pages.dev permanently preserve path and query to the apex", async () => {
  for (const host of ["www.thirdrailify.com", "thirdrailify.pages.dev"]) {
    const response = await onRequest(context(`https://${host}/watch/live?signal=1`));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), "https://thirdrailify.com/watch/live?signal=1");
  }
});

test("preparation mode and non-navigation methods do not redirect", async () => {
  const before = await onRequest(context("https://thirdrailify.pages.dev/watch", "GET", { ...env, THIRDRAILIFY_DOMAIN_CUTOVER_ACTIVE: "false" }));
  assert.equal(await before.text(), "next");
  const post = await onRequest(context("https://thirdrailify.pages.dev/api/example", "POST"));
  assert.equal(await post.text(), "next");
});

test("production shell and static SEO use canonical authority without global staging language", async () => {
  const [shell, index, wrangler, headers] = await Promise.all([
    readFile(new URL("../src/components/SiteShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(shell, /staging scaffold|Wix remains production/i);
  assert.match(index, /https:\/\/thirdrailify\.com\//);
  assert.doesNotMatch(index, /thirdrailify\.pages\.dev/);
  assert.match(wrangler, /"THIRDRAILIFY_PUBLIC_ORIGIN": "https:\/\/thirdrailify\.com"/);
  assert.match(wrangler, /"THIRDRAILIFY_ADMIN_ORIGIN": "https:\/\/admin\.thirdrailify\.com"/);
  assert.match(headers, /script-src[^\n]+https:\/\/static\.cloudflareinsights\.com/);
  assert.match(headers, /connect-src[^\n]+https:\/\/cloudflareinsights\.com/);
});
