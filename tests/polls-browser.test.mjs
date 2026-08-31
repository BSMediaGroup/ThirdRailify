import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4186";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = fileURLToPath(new URL("../.artifacts/polls-v1/", import.meta.url));

test("Public Poll gallery, modal, detail, vote, editor, popout, and responsive states", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4186"], { stdio: "ignore" });
  t.after(() => server.kill()); await wait();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport }); await consent(context); const page = await context.newPage(); const errors = [];
    page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); }); page.on("pageerror", (error) => errors.push(error.message)); await page.route("**/api/**", respond);
    await page.goto(`${ORIGIN}/polls`, { waitUntil: "networkidle" }); await page.getByRole("heading", { level: 1, name: /READ THE/ }).waitFor(); await page.getByText("Open audience choice").waitFor();
    await page.screenshot({ path: `${ARTIFACTS}/gallery-${viewport.width}.png`, fullPage: true }); assert.equal(await fits(page), true);
    if (viewport.width === 1440) { await page.getByRole("button", { name: "Quick view", exact: true }).first().click(); await page.getByRole("dialog").waitFor(); assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Close"); await page.screenshot({ path: `${ARTIFACTS}/quick-view-modal.png` }); await page.getByRole("button", { name: "Close", exact: true }).click(); }
    await page.goto(`${ORIGIN}/polls/open-audience-choice`, { waitUntil: "networkidle" }); await page.getByRole("heading", { level: 1, name: "Open audience choice" }).waitFor(); await page.screenshot({ path: `${ARTIFACTS}/detail-before-${viewport.width}.png`, fullPage: true });
    if (viewport.width === 1440) { await page.getByRole("button", { name: "Vote", exact: true }).first().click(); await page.getByText("Vote recorded.").waitFor(); await page.screenshot({ path: `${ARTIFACTS}/detail-after-vote.png`, fullPage: true }); }
    if (viewport.width === 390) { await page.goto(`${ORIGIN}/polls/new`, { waitUntil: "networkidle" }); await page.getByRole("heading", { level: 1, name: "Build a live Poll" }).waitFor(); await page.getByRole("textbox", { name: "Chat trigger" }).nth(1).fill("CARROT"); await page.getByPlaceholder("Type the complete message").fill("  carrot  "); await page.getByText("Matches Option two").waitFor(); await page.screenshot({ path: `${ARTIFACTS}/editor-mobile-custom-trigger.png`, fullPage: true }); assert.equal(await fits(page), true); }
    assert.deepEqual(errors, []); await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); await consent(context); const page = await context.newPage(); await page.route("**/api/**", respond);
  await page.goto(`${ORIGIN}/polls/new`, { waitUntil: "networkidle" }); await page.getByRole("heading", { name: "Build a live Poll" }).waitFor(); assert.equal(await page.getByRole("button", { name: /Move Option two up/ }).isEnabled(), true); assert.equal(await page.getByRole("button", { name: /Move Option one up/ }).isDisabled(), true); await page.screenshot({ path: `${ARTIFACTS}/editor-numeric-triggers.png`, fullPage: true }); await page.getByRole("textbox", { name: "Chat trigger" }).nth(1).fill("CARROT"); await page.getByPlaceholder("Type the complete message").fill("carrot!"); await page.getByText("No match").waitFor(); await page.screenshot({ path: `${ARTIFACTS}/editor-custom-tester-no-match.png`, fullPage: true });
  await page.goto(`${ORIGIN}/polls/signed-in-only`, { waitUntil: "networkidle" }); await page.screenshot({ path: `${ARTIFACTS}/signed-in-only-state.png`, fullPage: true });
  await page.goto(`${ORIGIN}/polls/open-audience-choice/popout`, { waitUntil: "networkidle" }); await page.getByRole("heading", { name: "Open audience choice" }).waitFor(); await page.screenshot({ path: `${ARTIFACTS}/popout.png`, fullPage: true }); assert.equal(await page.locator(".site-header").count(), 0); await context.close();
});

let voted = false;
async function respond(route) { const url = new URL(route.request().url()); const method = route.request().method();
  if (url.pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
  if (url.pathname === "/api/auth/session") return json(route, session());
  if (url.pathname === "/api/polls/access") return json(route, { ok: true, authenticated: true, canCreate: true, canManageAll: false });
  if (url.pathname === "/api/polls" && method === "GET") return json(route, { ok: true, items: [poll("open"), signedPoll(), poll("closed")], count: 3, refreshedAt: new Date().toISOString() });
  if (url.pathname.endsWith("/vote")) { voted = true; return json(route, { ok: true, poll: poll("open"), vote: { optionId: "opt_carrot", repeated: false, changed: false }, refreshedAt: new Date().toISOString() }); }
  if (url.pathname === "/api/polls/open-audience-choice") return json(route, { ok: true, poll: poll("open"), access: { canManage: true }, refreshedAt: new Date().toISOString() });
  if (url.pathname === "/api/polls/signed-in-only") return json(route, { ok: true, poll: signedPoll(), access: { canManage: false }, refreshedAt: new Date().toISOString() });
  return json(route, { ok: true }); }
function poll(state) { const open = state === "open"; return { id: `pol_${state}1234`, slug: "open-audience-choice", title: open ? "Open audience choice" : "Closed audience result", description: "Choose the complete signal that should lead the next segment.", state, public: true, webVotingMode: "anyone", rumbleEnabled: true, rumbleSourceScope: "user:sample-owner", livestreamMode: "automatic", livestreamId: null, revision: 3, totalVotes: voted ? 14 : 13, currentVoteOptionId: voted ? "opt_carrot" : null, options: [{ id: "opt_one1234", position: 0, label: "Option one", description: "First response", trigger: "1", normalizedTrigger: "1", votes: 5 }, { id: "opt_carrot", position: 1, label: "Option two", description: "Custom response", trigger: "CARROT", normalizedTrigger: "carrot", votes: voted ? 9 : 8 }], owner: { id: "creator", displayName: "Approved Creator", avatarUrl: null }, theme: { accent: "#f3c928", layout: "bars" }, updatedAt: new Date().toISOString(), openedAt: "2026-08-31T00:00:00Z", closedAt: open ? null : "2026-08-31T01:00:00Z" }; }
function signedPoll() { return { ...poll("open"), id: "pol_signed123", slug: "signed-in-only", title: "Signed-in only", webVotingMode: "signed_in", totalVotes: 0, currentVoteOptionId: null }; }
function session() { return { ok: true, authenticated: true, csrfToken: "poll-browser-csrf", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "creator", email: "creator@example.test", displayName: "Approved Creator", avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: "2026-08-31T00:00:00Z", source: "test" } }; }
async function consent(context) { const now = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 86400000).toISOString(), categories: { preferences: false, externalMedia: false } })), domain: "127.0.0.1", path: "/", expires: Math.floor((now + 86400000) / 1000), httpOnly: false, secure: false, sameSite: "Lax" }]); }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function fits(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
async function wait() { for (let index = 0; index < 80; index += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Public preview did not start"); }
