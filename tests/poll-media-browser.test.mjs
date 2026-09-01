import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4188";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = path.resolve(".artifacts/poll-media-editor");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZQAAAABJRU5ErkJggg==", "base64");

test("Poll media waits for uploads, reloads from server identity, survives later saves and removes cleanly", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  await startServer(t);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const state = fixtureState(); const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); await consent(context); const page = await context.newPage(); await routes(page, state);

  await page.goto(`${ORIGIN}/polls/new`, { waitUntil: "networkidle" });
  await page.getByLabel("Title", { exact: true }).fill("Media repair fixture");
  await page.getByLabel("Poll cover").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("1:1 image").nth(0).setInputFiles({ name: "one.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("1:1 image").nth(1).setInputFiles({ name: "two.png", mimeType: "image/png", buffer: PNG });
  assert.equal(await page.locator('img[src^="blob:"]').count(), 5, "editor and composed preview use only local blob previews before save");
  await page.screenshot({ path: path.join(ARTIFACTS, "01-local-previews-1440.png"), fullPage: true });
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByRole("button", { name: "Uploading images…" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Uploading images…" }).isDisabled(), true);
  await page.getByText("Draft created.").waitFor();
  assert.equal(state.createCount, 1); assert.deepEqual(state.uploads, ["banner", "option:opt-one", "option:opt-two"]);
  await assertAuthoritativeEditor(page, "immediate save");
  await page.screenshot({ path: path.join(ARTIFACTS, "02-saved-authoritative-1440.png"), fullPage: true });

  await page.reload({ waitUntil: "networkidle" }); await assertAuthoritativeEditor(page, "hard reload");
  await page.screenshot({ path: path.join(ARTIFACTS, "03-hard-reload-1440.png"), fullPage: true });
  await page.getByRole("textbox", { name: "Description", exact: true }).fill("Text-only second save"); await page.getByRole("button", { name: "Save draft" }).click(); await page.getByText("Draft saved at the latest revision.").waitFor();
  await page.reload({ waitUntil: "networkidle" }); await assertAuthoritativeEditor(page, "second save"); assert.equal(state.poll.description, "Text-only second save");
  await page.screenshot({ path: path.join(ARTIFACTS, "04-second-save-1440.png"), fullPage: true });

  await page.getByRole("button", { name: "Move Option two up" }).click(); await page.getByRole("button", { name: "Save draft" }).click(); await page.getByText("Draft saved at the latest revision.").waitFor();
  assert.deepEqual(state.poll.options.map((option) => [option.id, option.image?.id]), [["opt-two", "asset-two"], ["opt-one", "asset-one"]]);
  await page.reload({ waitUntil: "networkidle" }); assert.deepEqual(await page.locator(".poll-editor-options article img").evaluateAll((images) => images.map((image) => image.getAttribute("src"))), ["/api/polls/media/asset-two", "/api/polls/media/asset-one"]);

  await page.getByRole("button", { name: "Remove cover" }).click(); await page.getByText("Poll cover removed.", { exact: false }).waitFor(); assert.equal(state.poll.media.banner, null); assert.equal(await page.locator(".poll-cover-editor .poll-cover__fallback").count(), 1);
  await page.getByRole("button", { name: "Remove image" }).first().click(); await page.getByText("Option image removed.").waitFor(); assert.equal(state.poll.options[0].image, null); assert.equal(await page.locator(".poll-editor-option__media > img").count(), 1);
  await page.screenshot({ path: path.join(ARTIFACTS, "05-removal-fallbacks-1440.png"), fullPage: true });
  await context.close();
});

test("failed Poll upload retries against the created draft instead of creating a duplicate", async (t) => {
  await startServer(t);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const state = fixtureState(); state.failNextUpload = true; const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); await consent(context); const page = await context.newPage(); await routes(page, state);
  await page.goto(`${ORIGIN}/polls/new`, { waitUntil: "networkidle" }); await page.getByLabel("Title", { exact: true }).fill("Retry media fixture"); await page.getByLabel("Poll cover").setInputFiles({ name: "retry.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save draft" }).click(); await page.getByText("Synthetic Poll upload failure").waitFor(); assert.equal(state.createCount, 1); assert.equal(state.saveCount, 0); assert.equal(await page.locator('img[src^="blob:"]').count() > 0, true);
  await page.getByRole("button", { name: "Save draft" }).click(); await page.getByText("Draft saved at the latest revision.").waitFor(); assert.equal(state.createCount, 1); assert.equal(state.saveCount, 1);
  await page.getByAltText("Poll cover preview").waitFor(); assert.equal(await page.locator('img[src^="blob:"]').count(), 0, "upload retry: no blob URL remains"); assert.equal(await page.getByLabel("Poll cover").inputValue(), "", "upload retry: filename is not persistent authority");
  await page.screenshot({ path: path.join(ARTIFACTS, "06-mobile-upload-retry-390.png"), fullPage: true }); await context.close();
});

async function assertAuthoritativeEditor(page, label) {
  await page.getByAltText("Poll cover preview").waitFor(); await page.getByAltText("Option one preview").waitFor(); await page.getByAltText("Option two preview").waitFor();
  assert.equal(await page.locator('img[src^="blob:"]').count(), 0, `${label}: no blob URL remains`);
  assert.equal(await page.getByLabel("Poll cover").inputValue(), "", `${label}: filename is not persistent authority`);
  assert.deepEqual(await page.getByLabel("1:1 image").evaluateAll((inputs) => inputs.map((input) => input.value)), ["", ""]);
  assert.deepEqual(await page.locator(".poll-editor-option__media > img").evaluateAll((images) => images.map((image) => image.naturalWidth > 0)), [true, true]);
}

function fixtureState() { return { poll: null, createCount: 0, saveCount: 0, uploads: [], failNextUpload: false }; }
async function routes(page, state) { await page.route("**/api/**", async (route) => { const request = route.request(); const url = new URL(request.url()); const pathname = url.pathname; const method = request.method();
  if (pathname.startsWith("/api/polls/media/")) return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
  if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
  if (pathname === "/api/auth/session") return json(route, session());
  if (pathname === "/api/polls/access") return json(route, { ok: true, authenticated: true, canCreate: true, canManageAll: false });
  if (pathname === "/api/polls/discovery") return json(route, { ok: true, botState: "offline", freshness: null, source: null, livestreams: [], message: "Rumble source discovery temporarily unavailable." });
  if (pathname === "/api/polls" && method === "POST") { state.createCount += 1; state.poll = pollFromInput(request.postDataJSON(), 1); return json(route, { ok: true, poll: state.poll, access: access() }); }
  if (pathname === "/api/polls/media-repair-fixture" && method === "PUT") { state.saveCount += 1; state.poll = pollFromInput(request.postDataJSON(), state.poll.revision + 1, state.poll); return json(route, { ok: true, poll: state.poll, access: access() }); }
  if (pathname === "/api/polls/media-repair-fixture" && method === "GET") return json(route, { ok: true, poll: state.poll, access: access(), refreshedAt: now() });
  const media = pathname.match(/^\/api\/polls\/media-repair-fixture\/media\/(banner|option)(?:\/([^/]+))?$/);
  if (media && method === "POST") { await new Promise((resolve) => setTimeout(resolve, 180)); const key = media[1] === "banner" ? "banner" : `option:${decodeURIComponent(media[2])}`; state.uploads.push(key); if (state.failNextUpload) { state.failNextUpload = false; return json(route, { ok: false, error: "poll_media_upload_failed", message: "Synthetic Poll upload failure" }, 503); } attach(state.poll, media[1], media[2]); return json(route, { ok: true, asset: mediaAsset(media[1] === "banner" ? "asset-banner" : media[2] === "opt-one" ? "asset-one" : "asset-two", media[1], media[2]) }); }
  if (media && method === "DELETE") { if (media[1] === "banner") state.poll.media.banner = null; else state.poll.options.find((option) => option.id === decodeURIComponent(media[2])).image = null; return json(route, { ok: true, removed: true }); }
  return json(route, { ok: false, error: "not_found" }, 404);
}); }
function pollFromInput(input, revision, previous = null) { const options = input.options.map((item, index) => { const id = item.id || (index ? "opt-two" : "opt-one"); const existing = previous?.options.find((option) => option.id === id); return { id, position: index, label: item.label, description: item.description || null, trigger: item.trigger, normalizedTrigger: item.trigger.toLowerCase(), votes: 0, image: existing?.image || null }; }); return { id: "pol-media-repair", slug: "media-repair-fixture", title: input.title, description: input.description || "", state: "draft", public: false, webVotingMode: input.webVotingMode, rumbleEnabled: false, rumbleSourceScope: null, livestreamMode: "automatic", livestreamId: null, revision, totalVotes: 0, currentVoteOptionId: null, options, owner: { id: "creator", displayName: "Poll Creator", avatarUrl: null }, theme: input.theme, media: { banner: previous?.media.banner || null }, updatedAt: now(), openedAt: null, closedAt: null }; }
function attach(poll, purpose, optionId) { if (purpose === "banner") poll.media.banner = mediaAsset("asset-banner", "banner"); else { const option = poll.options.find((item) => item.id === decodeURIComponent(optionId)); option.image = mediaAsset(option.id === "opt-one" ? "asset-one" : "asset-two", "option", option.id); } }
function mediaAsset(id, purpose, optionId = null) { return { id, purpose, optionId, url: `/api/polls/media/${id}`, contentType: "image/png", byteSize: PNG.length, width: 1, height: 1, createdAt: now() }; }
function access() { return { canManage: true, canManageAll: false, isOwner: true }; }
function session() { return { ok: true, authenticated: true, csrfToken: "poll-media-csrf", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "creator", email: "creator@example.test", displayName: "Poll Creator", avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: now(), source: "test" } }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function now() { return new Date().toISOString(); }
async function consent(context) { const timestamp = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(timestamp).toISOString(), expiry: new Date(timestamp + 86400000).toISOString(), categories: { preferences: false, externalMedia: false } })), domain: "127.0.0.1", path: "/", expires: Math.floor((timestamp + 86400000) / 1000), httpOnly: false, secure: false, sameSite: "Lax" }]); }
async function startServer(t) { const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4188"], { stdio: "ignore" }); t.after(() => server.kill()); await waitForServer(); }
async function waitForServer() { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Poll media preview did not start."); }
