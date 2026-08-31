import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4187";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = fileURLToPath(new URL("../.artifacts/polls-v12/", import.meta.url));

test("Polls V1.2 keeps closed history visible, settled, manageable, and responsive", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4187"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForPreview();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  fixtureMode = "both";
  let context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await consent(context);
  let page = await context.newPage();
  await page.route("**/api/**", respond);
  await page.goto(`${ORIGIN}/polls`, { waitUntil: "networkidle" });
  const openSection = page.getByRole("region", { name: "Open Polls" });
  const pastSection = page.getByRole("region", { name: "Past Polls" });
  await openSection.getByRole("heading", { name: "Open audience choice" }).waitFor();
  await pastSection.getByRole("heading", { name: "Closed audience result" }).waitFor();
  assert.equal(await openSection.getByRole("heading", { name: "Closed audience result" }).count(), 0);
  assert.equal(await pastSection.getByRole("heading", { name: "Open audience choice" }).count(), 0);
  assert.equal(await fits(page), true);
  await page.screenshot({ path: `${ARTIFACTS}/gallery-open-and-past-1920.png`, fullPage: true });
  const closedCard = pastSection.locator(".poll-card--closed").first();
  const cardImage = await closedCard.locator(".poll-card__result img").boundingBox();
  assert.ok(cardImage && Math.abs(cardImage.width - cardImage.height) < 0.5, JSON.stringify(cardImage));
  await closedCard.screenshot({ path: `${ARTIFACTS}/closed-gallery-card.png` });

  await pastSection.getByRole("button", { name: "Quick view Closed audience result" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByText("Final top result").waitFor();
  assert.equal(await modal.getByRole("button", { name: "Vote", exact: true }).count(), 0);
  assert.equal(await modal.getByText("17 total votes").count(), 1);
  await modal.screenshot({ path: `${ARTIFACTS}/closed-quick-view.png` });
  await modal.getByRole("button", { name: "Close Poll quick view" }).click();
  await pastSection.getByRole("button", { name: "Load more Past Polls" }).click();
  await pastSection.getByRole("heading", { name: "Older settled signal" }).waitFor();
  assert.ok(closedPagesRequested.has(2));

  const search = page.getByRole("searchbox", { name: "Search" });
  await search.fill("tied");
  await pastSection.getByRole("heading", { name: "Tied final result" }).waitFor();
  await openSection.getByText("No Polls are open right now.").waitFor();
  assert.ok(searchedViews.has("open:tied") && searchedViews.has("closed:tied"));
  await context.close();

  fixtureMode = "zero-open";
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await consent(context);
  page = await context.newPage();
  await page.route("**/api/**", respond);
  await page.goto(`${ORIGIN}/polls`, { waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Open Polls" }).getByText("No Polls are open right now.").waitFor();
  await page.getByRole("region", { name: "Past Polls" }).getByRole("heading", { name: "Closed audience result" }).waitFor();
  await page.screenshot({ path: `${ARTIFACTS}/gallery-zero-open-history-present-1440.png`, fullPage: true });
  assert.equal(await fits(page), true);

  fixtureMode = "open-only";
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Open Polls" }).getByRole("heading", { name: "Open audience choice" }).waitFor();
  await page.getByRole("region", { name: "Past Polls" }).getByText("No completed Polls yet.").waitFor();
  fixtureMode = "none";
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Open Polls" }).getByText("No Polls are open right now.").waitFor();
  await page.getByRole("region", { name: "Past Polls" }).getByText("No completed Polls yet.").waitFor();
  fixtureMode = "open-error";
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Open Polls temporarily unavailable").waitFor();
  await page.getByRole("region", { name: "Past Polls" }).getByRole("heading", { name: "Closed audience result" }).waitFor();
  fixtureMode = "zero-open";

  await page.goto(`${ORIGIN}/polls/closed-audience-result`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Closed audience result" }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Back to Polls" }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Hide this closed Poll/ }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Vote", exact: true }).count(), 0);
  const detailImage = await page.locator(".poll-option__image").first().boundingBox();
  assert.ok(detailImage && Math.abs(detailImage.width - detailImage.height) < 0.5, JSON.stringify(detailImage));
  await page.screenshot({ path: `${ARTIFACTS}/closed-detail-non-owner-1440.png`, fullPage: true });

  await page.goto(`${ORIGIN}/polls/closed-audience-result/popout`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Closed audience result" }).waitFor();
  assert.equal(await page.locator(".site-header").count(), 0);
  assert.equal(await page.getByRole("link", { name: "Back to Polls" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Vote", exact: true }).count(), 0);
  await page.screenshot({ path: `${ARTIFACTS}/closed-popout-1440.png`, fullPage: true });

  await page.goto(`${ORIGIN}/polls/owner-closed-result`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Owner closed result" }).waitFor();
  const hide = page.getByRole("button", { name: "Hide this closed Poll from the gallery" });
  assert.equal(await hide.count(), 1);
  await page.screenshot({ path: `${ARTIFACTS}/closed-detail-owner-hide-1440.png`, fullPage: true });
  page.once("dialog", (dialog) => dialog.accept());
  await hide.click();
  await page.getByText("Poll is hidden from the public gallery.").waitFor();
  assert.equal(visibilityMutated, true);
  assert.equal(await page.getByRole("button", { name: "Show this closed Poll in the gallery" }).count(), 1);

  await page.goto(`${ORIGIN}/polls/tied-final-result`, { waitUntil: "networkidle" });
  await page.getByText("TIED TOP RESULT").first().waitFor();
  assert.equal(await page.getByText("TIED TOP RESULT").count(), 2);
  await page.screenshot({ path: `${ARTIFACTS}/closed-detail-tie-1440.png`, fullPage: true });
  await context.close();

  fixtureMode = "both";
  context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await consent(context);
  page = await context.newPage();
  await page.route("**/api/**", respond);
  await page.goto(`${ORIGIN}/polls`, { waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Past Polls" }).getByRole("heading", { name: "Closed audience result" }).waitFor();
  assert.equal(await fits(page), true);
  await page.screenshot({ path: `${ARTIFACTS}/mobile-history-gallery-390.png`, fullPage: true });
  await page.goto(`${ORIGIN}/polls/closed-audience-result`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Back to Polls" }).waitFor();
  assert.equal(await fits(page), true);
  await page.screenshot({ path: `${ARTIFACTS}/mobile-closed-detail-390.png`, fullPage: true });
  await context.close();

  fixtureMode = "transition";
  transitionOpenReads = 0;
  transitionClosedReads = 0;
  context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await consent(context);
  page = await context.newPage();
  await page.route("**/api/**", respond);
  await page.goto(`${ORIGIN}/polls`, { waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Open Polls" }).getByRole("heading", { name: "Lifecycle transition Poll" }).waitFor();
  await page.getByRole("region", { name: "Past Polls" }).getByRole("heading", { name: "Lifecycle transition Poll" }).waitFor({ timeout: 10_000 });
  assert.equal(await page.getByRole("region", { name: "Open Polls" }).getByRole("heading", { name: "Lifecycle transition Poll" }).count(), 0);
  assert.equal(transitionClosedReads, 2, "closed history loads initially and once for the lifecycle move, not on every live tick");
  assert.equal(await fits(page), true);
  await page.screenshot({ path: `${ARTIFACTS}/lifecycle-moved-to-past-768.png`, fullPage: true });
  await context.close();
});

let fixtureMode = "both";
let transitionOpenReads = 0;
let transitionClosedReads = 0;
let visibilityMutated = false;
const closedPagesRequested = new Set();
const searchedViews = new Set();

async function respond(route) {
  const url = new URL(route.request().url());
  const method = route.request().method();
  if (url.pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
  if (url.pathname === "/api/auth/session") return json(route, session());
  if (url.pathname === "/api/polls/access") return json(route, { ok: true, authenticated: true, canCreate: true, canManageAll: false });
  if (url.pathname === "/api/polls" && method === "GET") return gallery(route, url);
  if (url.pathname.endsWith("/visibility") && method === "POST") { visibilityMutated = true; return json(route, { ok: true, poll: { ...ownerClosed(), public: false, revision: 6 }, access: { canManage: true, canManageAll: false, isOwner: true } }); }
  if (url.pathname === "/api/polls/closed-audience-result") return json(route, { ok: true, poll: closedPoll(), access: { canManage: false, canManageAll: false, isOwner: false }, refreshedAt: now() });
  if (url.pathname === "/api/polls/owner-closed-result") return json(route, { ok: true, poll: visibilityMutated ? { ...ownerClosed(), public: false, revision: 6 } : ownerClosed(), access: { canManage: true, canManageAll: false, isOwner: true }, refreshedAt: now() });
  if (url.pathname === "/api/polls/tied-final-result") return json(route, { ok: true, poll: tiedPoll(), access: { canManage: false, canManageAll: false, isOwner: false }, refreshedAt: now() });
  return json(route, { ok: true });
}

function gallery(route, url) {
  const view = url.searchParams.get("view") || "open";
  const search = (url.searchParams.get("search") || "").toLowerCase();
  const page = Number(url.searchParams.get("page") || 1);
  searchedViews.add(`${view}:${search}`);
  if (view === "open") {
    if (fixtureMode === "open-error") return json(route, { ok: false, error: "polls_unavailable", message: "Open Polls fixture unavailable." }, 503);
    let items = new Set(["zero-open", "none"]).has(fixtureMode) ? [] : [openPoll()];
    if (fixtureMode === "transition") { transitionOpenReads += 1; items = transitionOpenReads === 1 ? [transitionPoll("open")] : []; }
    items = items.filter((poll) => matches(poll, search));
    return json(route, listPayload(view, items, page, items.length, 1, 24));
  }
  closedPagesRequested.add(page);
  if (fixtureMode === "transition") transitionClosedReads += 1;
  let items = fixtureMode === "open-only" || fixtureMode === "none" ? [] : page === 1 ? [closedPoll(), tiedPoll(), ownerClosed()] : [olderPoll()];
  if (fixtureMode === "transition" && transitionOpenReads > 1 && page === 1) items = [transitionPoll("closed"), ...items];
  items = items.filter((poll) => matches(poll, search));
  const total = search ? items.length : fixtureMode === "open-only" || fixtureMode === "none" ? 0 : 4;
  return json(route, listPayload(view, items, page, total, search || total === 0 ? (total ? 1 : 0) : 2, 12));
}

function listPayload(view, items, page, total, totalPages, pageSize) { return { ok: true, view, items, count: items.length, page, pageSize, total, totalPages, refreshedAt: now() }; }
function matches(poll, search) { return !search || `${poll.title} ${poll.description}`.toLowerCase().includes(search); }
function openPoll() { return poll({ id: "pol_open_v12", slug: "open-audience-choice", title: "Open audience choice", state: "open", votes: [8, 5, 2], ownerId: "creator" }); }
function closedPoll() { return poll({ id: "pol_closed_v12", slug: "closed-audience-result", title: "Closed audience result", state: "closed", votes: [11, 4, 2], ownerId: "another-owner" }); }
function ownerClosed() { return poll({ id: "pol_owner_v12", slug: "owner-closed-result", title: "Owner closed result", state: "closed", votes: [6, 3, 1], ownerId: "creator", revision: 5 }); }
function tiedPoll() { return poll({ id: "pol_tied_v12", slug: "tied-final-result", title: "Tied final result", state: "closed", votes: [7, 7, 2], ownerId: "another-owner", accent: "#8f6cff" }); }
function olderPoll() { return poll({ id: "pol_older_v12", slug: "older-settled-signal", title: "Older settled signal", state: "closed", votes: [4, 3, 1], ownerId: "another-owner" }); }
function transitionPoll(state) { return poll({ id: "pol_transition_v12", slug: "lifecycle-transition-poll", title: "Lifecycle transition Poll", state, votes: [9, 5, 1], ownerId: "creator" }); }
function poll({ id, slug, title, state, votes, ownerId, revision = 4, accent = "#f3c928" }) {
  const closed = state === "closed";
  const banner = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500"><rect width="1200" height="500" fill="#11110d"/><path d="M700 0 430 320h190l-70 180 330-360H680z" fill="${accent}" opacity=".72"/></svg>`)}`;
  const optionImage = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${accent}"/><circle cx="100" cy="100" r="56" fill="#fff" opacity=".72"/></svg>`)}`;
  const labels = ["Ride the rail", "Keep the signal", "Take the branch"];
  return { id, slug, title, description: `${title} fixture for historical Poll acceptance.`, state, public: true, webVotingMode: "anyone", rumbleEnabled: true, rumbleSourceScope: "user:1sl8zm", livestreamMode: "automatic", livestreamId: null, revision, totalVotes: votes.reduce((sum, value) => sum + value, 0), currentVoteOptionId: null, options: labels.map((label, position) => ({ id: `${id}_opt_${position}`, position, label, description: `Final option ${position + 1}`, trigger: String(position + 1), normalizedTrigger: String(position + 1), votes: votes[position], image: position === 0 ? { id: `${id}_image`, purpose: "option", optionId: `${id}_opt_${position}`, url: optionImage, contentType: "image/svg+xml", byteSize: 1, width: 200, height: 200, createdAt: now() } : null })), owner: { id: ownerId, displayName: ownerId === "creator" ? "Approved Creator" : "Guest Creator", avatarUrl: null }, theme: { accent, layout: "bars" }, media: { banner: { id: `${id}_banner`, purpose: "banner", url: banner, contentType: "image/svg+xml", byteSize: 1, width: 1200, height: 500, createdAt: now() } }, updatedAt: now(), openedAt: "2026-09-01T00:00:00Z", closedAt: closed ? "2026-09-01T02:00:00Z" : null };
}
function session() { return { ok: true, authenticated: true, csrfToken: "poll-v12-csrf", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "creator", email: "creator@example.test", displayName: "Approved Creator", avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: now(), source: "test" } }; }
function now() { return new Date().toISOString(); }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function consent(context) { const timestamp = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(timestamp).toISOString(), expiry: new Date(timestamp + 86400000).toISOString(), categories: { preferences: false, externalMedia: false } })), domain: "127.0.0.1", path: "/", expires: Math.floor((timestamp + 86400000) / 1000), httpOnly: false, secure: false, sameSite: "Lax" }]); }
async function fits(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
async function waitForPreview() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* preview starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Public preview did not start."); }
