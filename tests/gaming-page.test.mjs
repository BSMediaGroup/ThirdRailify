import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeSteamStoreUrl, steamSearchUrl } from "../src/gaming/client.ts";
import { GAMING_ROTATION, GAMING_RUMBLE_URL, GAMING_SCHEDULE } from "../src/gaming/rotation.ts";
import { staticSeoForPath } from "../seo/site-seo.js";

test("Gaming content authority preserves the supplied schedule and exact rotation labels", () => {
  assert.equal(GAMING_RUMBLE_URL, "https://rumble.com/thirdrailifygaming");
  assert.deepEqual(GAMING_SCHEDULE, [
    { day: "MON", time: "2 PM" },
    { day: "TUE", time: "2 PM" },
    { day: "THU", time: "2 PM" },
    { day: "FRI", time: "2 PM" },
  ]);
  assert.deepEqual(GAMING_ROTATION.map(({ title }) => title), ["WITCHER", "LUMINARY", "SUPER MARIO WORLD", "PARTY ANIMAL"]);
  assert.equal(GAMING_ROTATION.filter(({ steam }) => steam).length, 1);
  assert.equal(GAMING_ROTATION[1].steam?.appId, "1648360");
  assert.equal(GAMING_ROTATION[1].steam?.storeUrl, "https://store.steampowered.com/app/1648360/Luminary/");
  assert.equal(GAMING_ROTATION[0].steam, null);
  assert.equal(GAMING_ROTATION[2].steam, null);
  assert.equal(GAMING_ROTATION[3].steam, null);
});

test("Steam helpers accept only exact HTTPS app listings and encode manual searches", () => {
  assert.equal(normalizeSteamStoreUrl(" https://store.steampowered.com/app/1648360/Luminary/?utm_source=test "), "https://store.steampowered.com/app/1648360/");
  assert.equal(normalizeSteamStoreUrl("https://store.steampowered.com/app/1648360/Luminary/"), "https://store.steampowered.com/app/1648360/");
  assert.equal(normalizeSteamStoreUrl("https://store.steampowered.com/app/1648360"), "https://store.steampowered.com/app/1648360/");
  assert.equal(normalizeSteamStoreUrl("http://store.steampowered.com/app/1648360/"), "");
  assert.equal(normalizeSteamStoreUrl("https://evil.example/app/1648360/"), "");
  assert.equal(normalizeSteamStoreUrl("https://store.steampowered.com/search/?term=Luminary"), "");
  assert.equal(steamSearchUrl("Risk of Rain 2"), "https://store.steampowered.com/search/?term=Risk%20of%20Rain%202");
});

test("Gaming is a first-class public route with route SEO and scoped green theme lifecycle", async () => {
  const [app, shell, page, styles] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/SiteShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/GamingPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/gaming.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /path="\/gaming" element={<GamingPage \/>}/);
  assert.match(shell, /to: "\/gaming", label: "Gaming"/);
  assert.match(shell, /<Link to="\/gaming">Gaming<\/Link>/);
  assert.match(page, /classList\.add\("theme-gaming"\)/);
  assert.match(page, /classList\.remove\("theme-gaming"\)/);
  assert.match(styles, /html\.theme-gaming/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  const seo = staticSeoForPath("/gaming", "https://thirdrailify.com");
  assert.equal(seo.title, "Third Railify Gaming | Third Railify");
  assert.equal(seo.canonicalUrl, "https://thirdrailify.com/gaming");
  assert.match(seo.robots, /^index, follow/);
});
