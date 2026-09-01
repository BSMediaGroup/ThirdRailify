import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4207";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = path.resolve(".artifacts/gaming-public");
const SCREENSHOTS = process.env.GAMING_BROWSER_SCREENSHOTS === "1";

test("Gaming route is responsive, accessible, content-complete, and theme-scoped", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4207"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  if (SCREENSHOTS) await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of [[1920, 1080], [1440, 1000], [1024, 900], [768, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await installTurnstile(context);
    const page = await context.newPage();
    const errors = collectBrowserErrors(page);
    await mockApis(page, []);
    await page.goto(`${ORIGIN}/gaming`);
    await page.getByRole("heading", { level: 1, name: /Third Railify\s*Gaming/i }).waitFor();
    await dismissPrivacy(page);

    assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), true);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no overflow at ${width}x${height}`);
    assert.equal(await page.locator('.gaming-hero a[href="https://rumble.com/thirdrailifygaming"]').count(), 1);
    assert.equal(await page.locator(".gaming-instrument__portal polygon").count(), 3, "hero has a layered wireframe game-world portal");
    assert.equal(await page.locator(".gaming-instrument__terrain path").count(), 4, "hero has a planar terrain mesh");
    assert.equal(await page.locator(".gaming-instrument__shards polygon").count(), 4, "hero has floating geometric shards");
    assert.equal(await page.locator(".gaming-instrument__reticle").isVisible(), true, "hero targeting reticle is visible");
    assert.equal(await page.locator(".gaming-instrument__core svg").count(), 1, "hero loadout core includes the game controller mark");
    const heroGeometry = await page.locator(".gaming-hero").evaluate((element) => {
      const heroBox = element.getBoundingClientRect();
      const instrumentBox = element.querySelector(".gaming-instrument").getBoundingClientRect();
      return { heroBox: { left: heroBox.left, right: heroBox.right }, instrumentBox: { left: instrumentBox.left, right: instrumentBox.right, width: instrumentBox.width } };
    });
    assert.ok(heroGeometry.instrumentBox.width >= Math.min(340, width - 40), `game-world instrument remains substantial at ${width}px`);
    assert.ok(heroGeometry.instrumentBox.left >= heroGeometry.heroBox.left && heroGeometry.instrumentBox.right <= heroGeometry.heroBox.right, `game-world instrument stays inside the hero at ${width}px`);
    assert.deepEqual(await page.locator(".gaming-schedule > div > span > strong").allTextContents(), ["MON", "TUE", "THU", "FRI"]);
    assert.deepEqual(await page.locator(".gaming-schedule > div > span > small").allTextContents(), ["2 PM", "2 PM", "2 PM", "2 PM"]);
    assert.equal(await page.locator(".gaming-card").count(), 4);
    assert.deepEqual(await page.locator(".gaming-card h3").allTextContents(), ["THE WITCHER 3: WILD HUNT - COMPLETE EDITION", "LUMINARY", "SUPER MARIO WORLD", "PARTY ANIMALS"]);
    assert.deepEqual(await page.locator(".gaming-card__platform").allTextContents(), ["PC via Steam", "PC via Steam", "PC via Steam", "PC via Steam"]);
    assert.equal(await page.locator(".gaming-card__description").evaluateAll((nodes) => nodes.every((node) => Boolean(node.textContent?.trim()))), true, "every rotation dossier retains its description");
    assert.deepEqual(await page.locator(".gaming-card__status").allTextContents(), [" IN ROTATION", " IN ROTATION", " IN ROTATION", " IN ROTATION"]);
    assert.equal(await page.locator('.gaming-card a[href="https://store.steampowered.com/app/292030/"]').count(), 1);
    assert.equal(await page.locator('.gaming-card a[href="https://store.steampowered.com/app/1648360/"]').count(), 1);
    assert.equal(await page.locator('.gaming-card a[href="https://store.steampowered.com/app/1260320/"]').count(), 1);
    assert.equal(await page.locator('.gaming-card a[href*="store.steampowered.com/app/"]').count(), 3);
    assert.equal(await page.locator('.gaming-card[data-cover="fallback"]').count(), 1);
    assert.equal(await page.title(), "Third Railify Gaming | Third Railify");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${ORIGIN}/gaming`);

    await page.locator(".gaming-rotation").scrollIntoViewIfNeeded();
    await page.locator(".gaming-card__cover").evaluateAll((images) => Promise.all(images.map((image) => image.complete && image.naturalWidth > 0 ? true : new Promise((resolve) => { image.addEventListener("load", () => resolve(true), { once: true }); image.addEventListener("error", () => resolve(false), { once: true }); }))));
    await page.waitForFunction(() => document.querySelectorAll('.gaming-card[data-artwork-shape="pending"]').length === 0);
    await assertRotationGeometry(page, width, height);

    if (width === 1440) {
      const showParent = page.getByRole("link", { name: "The show", exact: true });
      assert.equal(await showParent.getAttribute("href"), "/about", "The show remains a clickable route");
      await showParent.hover();
      const showDropdown = page.locator(".desktop-nav__show .community-dropdown");
      await showDropdown.waitFor({ state: "visible" });
      assert.deepEqual(await showDropdown.locator("a").allTextContents(), ["Shawn", "Gina", "Gaming"]);
      assert.deepEqual(await showDropdown.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))), ["/shawn", "/gina", "/gaming"]);
      assert.equal(await page.locator('.desktop-nav__community:not(.desktop-nav__show) .community-dropdown a[href="/gaming"]').count(), 0, "Gaming is removed from Community");
      if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "show-dropdown-1440x1000.png"), fullPage: false });
    }

    if (SCREENSHOTS && [1920, 1440, 390].includes(width)) {
      await page.screenshot({ path: path.join(ARTIFACTS, `hero-${width}x${height}.png`), fullPage: false });
      await page.locator(".gaming-hero").screenshot({ path: path.join(ARTIFACTS, `hero-section-${width}x${height}.png`) });
      await page.locator(".gaming-about").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(ARTIFACTS, `about-${width}x${height}.png`), fullPage: false });
    }
    if (SCREENSHOTS && [1920, 1440, 1024, 390].includes(width)) await captureRotationSection(page, path.join(ARTIFACTS, `rotation-section-${width}x${height}.png`));
    if (SCREENSHOTS && width === 1440) {
      await page.mouse.move(width - 2, height - 2);
      await page.waitForTimeout(100);
      await page.locator(".gaming-card--runes").screenshot({ path: path.join(ARTIFACTS, "rotation-witcher-closeup-1440.png") });
      await page.locator(".gaming-card--luminary").screenshot({ path: path.join(ARTIFACTS, "rotation-luminary-closeup-1440.png") });
      await page.locator(".gaming-card--world").screenshot({ path: path.join(ARTIFACTS, "rotation-super-mario-world-fallback-1440.png") });
      await page.locator(".gaming-card--party").screenshot({ path: path.join(ARTIFACTS, "rotation-party-animals-closeup-1440.png") });
    }

    if (width <= 1120) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.getByRole("button", { name: "Open navigation" }).click();
      const mobileNav = page.locator(".mobile-nav");
      await mobileNav.waitFor({ state: "visible" });
      await page.waitForTimeout(300);
      const menuGeometry = await mobileNav.evaluate((nav) => {
        const box = nav.getBoundingClientRect();
        const header = document.querySelector(".site-header")?.getBoundingClientRect();
        const styles = getComputedStyle(nav);
        const account = nav.querySelector(".mobile-nav__account")?.getBoundingClientRect();
        nav.scrollTop = nav.scrollHeight;
        const scrolledAccount = nav.querySelector(".mobile-nav__account")?.getBoundingClientRect();
        return {
          position: styles.position,
          overflowY: styles.overflowY,
          top: box.top,
          bottom: box.bottom,
          headerBottom: header?.bottom || 0,
          viewportHeight: window.innerHeight,
          clientHeight: nav.clientHeight,
          scrollHeight: nav.scrollHeight,
          scrollTop: nav.scrollTop,
          accountInitiallyBelowFold: Boolean(account && account.bottom > box.bottom),
          accountVisibleAfterScroll: Boolean(scrolledAccount && scrolledAccount.top >= box.top && scrolledAccount.bottom <= box.bottom),
          rootOverflow: getComputedStyle(document.documentElement).overflow,
          bodyOverflow: getComputedStyle(document.body).overflow,
        };
      });
      assert.equal(menuGeometry.position, "fixed", JSON.stringify(menuGeometry));
      assert.equal(menuGeometry.overflowY, "auto", JSON.stringify(menuGeometry));
      assert.ok(Math.abs(menuGeometry.top - menuGeometry.headerBottom) <= 1, JSON.stringify(menuGeometry));
      assert.ok(Math.abs(menuGeometry.bottom - menuGeometry.viewportHeight) <= 1, JSON.stringify(menuGeometry));
      assert.equal(menuGeometry.rootOverflow, "hidden", JSON.stringify(menuGeometry));
      assert.equal(menuGeometry.bodyOverflow, "hidden", JSON.stringify(menuGeometry));
      if (menuGeometry.scrollHeight > menuGeometry.clientHeight) {
        assert.ok(menuGeometry.scrollTop > 0, JSON.stringify(menuGeometry));
        assert.equal(menuGeometry.accountVisibleAfterScroll, true, JSON.stringify(menuGeometry));
      }
      if (width === 390) {
        assert.deepEqual(await page.locator(".mobile-nav__show > div > a").allTextContents(), ["Shawn", "Gina", "Gaming"]);
        assert.equal(await page.locator('.mobile-nav__show > a[href="/about"]').isVisible(), true);
        assert.equal(await page.locator('.mobile-nav__community:not(.mobile-nav__show) a[href="/gaming"]').count(), 0);
        assert.equal(menuGeometry.accountInitiallyBelowFold || menuGeometry.scrollHeight <= menuGeometry.clientHeight, true, JSON.stringify(menuGeometry));
        if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "mobile-menu-scrolled-390x844.png"), fullPage: false });
      }
      await page.getByRole("button", { name: "Close navigation" }).click();
      await mobileNav.waitFor({ state: "hidden" });
      assert.equal(await page.locator("html.mobile-nav-open").count(), 0, "closing the menu restores document scrolling");
      if (width === 390) {
        await page.setViewportSize({ width: 390, height: 568 });
        await page.getByRole("button", { name: "Open navigation" }).click();
        await mobileNav.waitFor({ state: "visible" });
        await page.waitForTimeout(300);
        const overflowProof = await mobileNav.evaluate((nav) => {
          const box = nav.getBoundingClientRect();
          nav.scrollTop = nav.scrollHeight;
          const account = nav.querySelector(".mobile-nav__account")?.getBoundingClientRect();
          return { clientHeight: nav.clientHeight, scrollHeight: nav.scrollHeight, scrollTop: nav.scrollTop, bottom: box.bottom, viewportHeight: window.innerHeight, accountVisible: Boolean(account && account.top >= box.top && account.bottom <= box.bottom) };
        });
        assert.ok(overflowProof.scrollHeight > overflowProof.clientHeight, JSON.stringify(overflowProof));
        assert.ok(overflowProof.scrollTop > 0, JSON.stringify(overflowProof));
        assert.equal(overflowProof.accountVisible, true, JSON.stringify(overflowProof));
        assert.ok(Math.abs(overflowProof.bottom - overflowProof.viewportHeight) <= 1, JSON.stringify(overflowProof));
        if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "mobile-menu-overflow-bottom-390x568.png"), fullPage: false });
        await page.getByRole("button", { name: "Close navigation" }).click();
        await mobileNav.waitFor({ state: "hidden" });
      }
    }

    assert.deepEqual(errors, [], `browser errors at ${width}x${height}`);
    await context.close();
  }
});

test("Gaming request form normalizes exact Steam listings and preserves input after a safe backend failure", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4208"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer("http://127.0.0.1:4208");
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installTurnstile(context);
  const page = await context.newPage();
  const submissions = [];
  await mockApis(page, submissions, { failFirstSuggestion: true });
  await page.goto("http://127.0.0.1:4208/gaming#suggest");
  await dismissPrivacy(page);
  await page.locator(".gaming-form").scrollIntoViewIfNeeded();
  if (SCREENSHOTS) { await mkdir(ARTIFACTS, { recursive: true }); await page.screenshot({ path: path.join(ARTIFACTS, "suggestion-form-1440x1000.png"), fullPage: false }); }
  await page.locator('input[name="gameTitle"]').fill("Risk of Rain 2");
  assert.equal(await page.getByRole("link", { name: /Search Steam for Risk of Rain 2/ }).getAttribute("href"), "https://store.steampowered.com/search/?term=Risk%20of%20Rain%202");
  await page.locator('input[name="steamUrl"]').fill("https://store.steampowered.com/app/632360/Risk_of_Rain_2/");
  await page.locator('textarea[name="pitch"]').fill("A co-op run with enough chaos to earn the slot.");
  const submit = page.getByRole("button", { name: /Submit request/ });
  await assertEventually(async () => !(await submit.isDisabled()));
  await submit.click();
  await page.getByRole("alert").getByText("The request queue is temporarily unavailable.", { exact: true }).waitFor();
  assert.equal(await page.locator('input[name="gameTitle"]').inputValue(), "Risk of Rain 2");
  assert.equal(await page.locator('textarea[name="pitch"]').inputValue(), "A co-op run with enough chaos to earn the slot.");
  await assertEventually(async () => !(await submit.isDisabled()));
  await submit.click();
  await page.getByText("Signal received.", { exact: true }).waitFor();
  assert.equal(submissions.length, 2);
  assert.equal(submissions[1].gameTitle, "Risk of Rain 2");
  assert.equal(submissions[1].steamUrl, "https://store.steampowered.com/app/632360/");
  assert.equal(submissions[1].turnstileToken, "fixture-gaming-token");
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "suggestion-success-1440x1000.png"), fullPage: false });
});

test("Gaming managed rotation reflects additions/removals and shows truthful unavailability", async (t) => {
  const server=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4210"],{stdio:"ignore"});t.after(()=>server.kill());await waitForServer("http://127.0.0.1:4210");const browser=await chromium.launch({executablePath:CHROME,headless:true});t.after(()=>browser.close());const context=await browser.newContext({viewport:{width:1024,height:900}});await installTurnstile(context);const page=await context.newPage();const added={id:"gaming-new",title:"NEW MANAGED GAME",platform:"PC",description:"Newly promoted from the historical library.",genre:"STRATEGY",artworkUrl:null,steam:null,position:1};await mockApis(page,[],{rotationItems:[added]});await page.goto("http://127.0.0.1:4210/gaming");await page.getByRole("heading",{name:"NEW MANAGED GAME"}).waitFor();assert.equal(await page.getByRole("heading",{name:"WITCHER"}).count(),0);assert.equal(await page.locator('.gaming-card[data-cover="fallback"]').count(),1);await page.unroute("**/api/**");await mockApis(page,[],{failRotation:true});await page.reload();await page.getByRole("heading",{name:"Current Rotation unavailable"}).waitFor();assert.equal(await page.locator(".gaming-card").count(),0);assert.match(await page.locator(".gaming-rotation__state p").textContent(),/hardcoded list is not being substituted/);await context.close();
});

test("Gaming motion respects reduced motion and the green root theme is removed on SPA navigation", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4209"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer("http://127.0.0.1:4209");
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await installTurnstile(context);
  const page = await context.newPage();
  await mockApis(page, []);
  await page.goto("http://127.0.0.1:4209/gaming");
  await dismissPrivacy(page);
  assert.equal(await page.locator(".gaming-hero").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".gaming-instrument__portal-back").evaluate((node) => getComputedStyle(node).animationName), "none");
  assert.equal(await page.locator(".gaming-instrument__floor-grid").evaluate((node) => getComputedStyle(node).animationName), "none");
  const gamingScrollbar = await page.locator("html").evaluate((node) => getComputedStyle(node).scrollbarColor);
  assert.match(gamingScrollbar, /69, 227, 125|rgb\(69 227 125\)/);
  if (SCREENSHOTS) { await mkdir(ARTIFACTS, { recursive: true }); await page.screenshot({ path: path.join(ARTIFACTS, "gaming-scrollbar-reduced-motion-1280x900.png"), fullPage: false }); }
  await page.locator('.site-footer a[href="/shop"]').evaluate((link) => link.click());
  await page.waitForURL("http://127.0.0.1:4209/shop");
  assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), false);
  const standardScrollbar = await page.locator("html").evaluate((node) => getComputedStyle(node).scrollbarColor);
  assert.notEqual(standardScrollbar, gamingScrollbar);
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "normal-shop-theme-restored-1280x900.png"), fullPage: false });
  await page.goBack();
  await page.waitForURL("http://127.0.0.1:4209/gaming");
  assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), true);
  await page.locator(".gaming-close").scrollIntoViewIfNeeded();
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "closing-cta-reduced-motion-1280x900.png"), fullPage: false });
});

async function installTurnstile(context) {
  await context.addInitScript(() => {
    let currentOptions;
    window.turnstile = {
      render(container, options) { currentOptions = options; container.textContent = "Human verification complete"; setTimeout(() => options.callback("fixture-gaming-token"), 0); return "gaming-widget"; },
      reset() { setTimeout(() => currentOptions?.callback("fixture-gaming-token"), 0); }, remove() {},
    };
  });
}

async function mockApis(page, submissions, options = {}) {
  let suggestionAttempts = 0;
  await page.route("https://gaming-fixture.test/**", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()?.replace(".svg", "") || "GAME";
    const portrait = name === "luminary";
    const width = portrait ? 600 : 920;
    const height = portrait ? 900 : 430;
    const title = name.replaceAll("-", " ").toUpperCase();
    const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#183a28"/><stop offset="1" stop-color="#050907"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><path d="M0 ${height * .72} L${width * .38} ${height * .25} L${width * .62} ${height * .62} L${width} ${height * .18} V${height} H0Z" fill="#3fbb6d" opacity=".34"/><text x="50%" y="48%" text-anchor="middle" fill="#effff3" font-family="Arial Narrow,Arial" font-size="${portrait ? 62 : 72}" font-weight="700">${title}</text><text x="50%" y="58%" text-anchor="middle" fill="#76f39e" font-family="monospace" font-size="22">CURRENT ROTATION</text></svg>`;
    return route.fulfill({ status: 200, contentType: "image/svg+xml", body });
  });
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/gaming/rotation") return options.failRotation?json(route,{ok:false,error:"gaming_rotation_unavailable"},503):json(route,{...gamingRotation(),...(options.rotationItems?{items:options.rotationItems}:{})});
    if (pathname === "/api/gaming/suggestions") {
      suggestionAttempts += 1;
      submissions.push(JSON.parse(route.request().postData() || "{}"));
      if (options.failFirstSuggestion && suggestionAttempts === 1) return json(route, { ok: false, error: "relay_unavailable", message: "The request queue is temporarily unavailable." }, 503);
      return json(route, { ok: true, reference: "GAM-TEST0001", message: "Your game request entered the Third Railify Gaming queue." });
    }
    if (pathname === "/api/auth/config") { const requestOrigin = new URL(route.request().url()).origin; return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: "fixture-site-key", oauthProviders: [], oauthProviderStates: [], publicOrigin: requestOrigin, adminOrigin: requestOrigin, environment: "test", cookieMode: "host-only" }); }
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-09-01", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], collections: [], updatedAt: null });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/community/discord") return json(route, { available: false, channels: [], voiceSpaces: [], members: [] });
    if (pathname === "/api/analytics") return json(route, { ok: true });
    return json(route, { error: "not_found" }, 404);
  });
}

function gamingRotation(){return{ok:true,schema:"thirdrailify-gaming-rotation-v1",updatedAt:"2026-09-01T00:00:00.000Z",items:[
  {id:"gaming-witcher",title:"THE WITCHER 3: WILD HUNT - COMPLETE EDITION",platform:"PC via Steam",description:"You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract is tracking down Ciri, the Child of Prophecy, a living weapon that can alter the shape of the world.",genre:"RPG GAMES",artworkUrl:"https://gaming-fixture.test/witcher.svg",steam:{appId:"292030",storeUrl:"https://store.steampowered.com/app/292030/"},position:1},
  {id:"gaming-luminary",title:"LUMINARY",platform:"PC via Steam",description:"Solo or co-op exploration, character progression, and a campaign built around pushing back the dark with light.",genre:"ACTION RPG / CO-OP",artworkUrl:"https://gaming-fixture.test/luminary.svg",steam:{appId:"1648360",storeUrl:"https://store.steampowered.com/app/1648360/"},position:2},
  {id:"gaming-super-mario-world",title:"SUPER MARIO WORLD",platform:"PC via Steam",description:"Classic platforming rhythm, secret routes, and one more level turning into an entire night.",genre:"PLATFORMER",artworkUrl:null,steam:null,position:3},
  {id:"gaming-party-animal",title:"PARTY ANIMALS",platform:"PC via Steam",description:"Fight your friends as puppies, kittens and other fuzzy creatures in PARTY ANIMALS! Paw it out with your friends remotely, or huddle together for chaotic fun on the same screen. Interact with the world under a realistic physics engine.",genre:"ACTION GAMES",artworkUrl:"https://gaming-fixture.test/party-animals.svg",steam:{appId:"1260320",storeUrl:"https://store.steampowered.com/app/1260320/"},position:4},
]};}

async function assertRotationGeometry(page, width, height) {
  const geometry = await page.locator(".gaming-card").evaluateAll((cards) => cards.map((card) => {
    const rect = (node) => { const box = node.getBoundingClientRect(); return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height }; };
    return {
      title: card.querySelector("h3")?.textContent?.trim(),
      card: rect(card),
      visual: rect(card.querySelector(".gaming-card__visual")),
      body: rect(card.querySelector(".gaming-card__body")),
      heading: rect(card.querySelector("h3")),
      footer: rect(card.querySelector("footer")),
      cover: card.getAttribute("data-cover"),
      shape: card.getAttribute("data-artwork-shape"),
      objectFit: getComputedStyle(card.querySelector(".gaming-card__cover") || card.querySelector(".gaming-card__fallback")).objectFit,
    };
  }));
  const tolerance = .002;
  for (const item of geometry) {
    const ratio = item.visual.width / item.visual.height;
    assert.ok(ratio + tolerance >= 9 / 16, `${item.title} artwork ratio ${ratio.toFixed(4)} is at least 9:16 at ${width}x${height}`);
    assert.ok(item.visual.width > 0 && item.visual.height > 0, `${item.title} artwork remains visible at ${width}x${height}`);
    assert.ok(item.heading.left >= item.card.left - 1 && item.heading.right <= item.card.right + 1 && item.heading.top >= item.card.top - 1 && item.heading.bottom <= item.card.bottom + 1, `${item.title} heading remains inside its card at ${width}x${height}`);
    assert.ok(item.footer.left >= item.card.left - 1 && item.footer.right <= item.card.right + 1 && item.footer.bottom <= item.card.bottom + 1, `${item.title} footer remains reachable inside its card at ${width}x${height}`);
    if (width > 1180) {
      assert.ok(Math.abs(ratio - 2 / 3) <= .01, `${item.title} uses the preferred 2:3 poster frame at ${width}x${height}`);
      assert.ok(item.visual.width / item.card.width >= .38 && item.visual.width / item.card.width <= .45, `${item.title} artwork occupies a substantial desktop card fraction at ${width}x${height}`);
      assert.ok(item.visual.right <= item.body.left + 1, `${item.title} artwork and details do not overlap at ${width}x${height}`);
    } else if (width > 620) {
      assert.ok(Math.abs(ratio - 1) <= .01, `${item.title} uses a deliberate square tablet frame at ${width}x${height}`);
      assert.ok(item.visual.right <= item.body.left + 1, `${item.title} artwork and details do not overlap at ${width}x${height}`);
    } else {
      assert.ok(Math.abs(ratio - 3 / 4) <= .01, `${item.title} uses the intentional 3:4 mobile frame at ${width}x${height}`);
      assert.ok(item.visual.bottom <= item.body.top + 1, `${item.title} stacked artwork and details do not overlap at ${width}x${height}`);
    }
  }
  assert.equal(geometry.find((item) => item.title === "SUPER MARIO WORLD")?.cover, "fallback", `fallback card preserves valid geometry at ${width}x${height}`);
  assert.equal(geometry.find((item) => item.title === "THE WITCHER 3: WILD HUNT - COMPLETE EDITION")?.shape, "landscape", "Witcher landscape art is detected");
  assert.equal(geometry.find((item) => item.title === "PARTY ANIMALS")?.shape, "landscape", "Party Animals landscape art is detected");
  assert.equal(geometry.find((item) => item.title === "LUMINARY")?.shape, "poster", "Luminary poster art is detected");
  assert.equal(await page.locator('.gaming-card[data-artwork-shape="landscape"] .gaming-card__cover').evaluateAll((images) => images.every((image) => getComputedStyle(image).objectFit === "contain")), true, "landscape covers avoid catastrophic poster cropping");
  const expectedPosterFit = width > 620 && width <= 1180 ? "contain" : "cover";
  assert.equal(await page.locator('.gaming-card[data-artwork-shape="poster"] .gaming-card__cover').evaluateAll((images, expected) => images.every((image) => getComputedStyle(image).objectFit === expected), expectedPosterFit), true, "poster covers use the breakpoint-appropriate fit");
  const cardsOverlap = geometry.some((item, index) => geometry.slice(index + 1).some((other) => item.card.left < other.card.right - 1 && item.card.right > other.card.left + 1 && item.card.top < other.card.bottom - 1 && item.card.bottom > other.card.top + 1));
  assert.equal(cardsOverlap, false, `rotation cards do not overlap at ${width}x${height}`);
}

async function captureRotationSection(page, screenshotPath) {
  const screenshotMode = await page.addStyleTag({ content: ".site-header,.skip-link,.community-dropdown{visibility:hidden!important}" });
  await page.locator(".gaming-rotation").screenshot({ path: screenshotPath });
  await screenshotMode.evaluate((style) => style.remove());
}

function collectBrowserErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return errors;
}
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function dismissPrivacy(page) { const dock = page.locator(".privacy-dock"); if (await dock.isVisible()) await dock.getByRole("button", { name: "Reject non-essential" }).click(); }
async function waitForServer(origin = ORIGIN) { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(origin)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`Vite Gaming test server did not start at ${origin}.`); }
async function assertEventually(assertion) { for (let attempt = 0; attempt < 80; attempt += 1) { if (await assertion()) return; await new Promise((resolve) => setTimeout(resolve, 25)); } assert.fail("condition did not become true"); }
