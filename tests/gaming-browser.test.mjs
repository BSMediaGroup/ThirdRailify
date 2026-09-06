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

  for (const [width, height] of [[1920, 1080], [1440, 900], [1365, 768], [1024, 900], [768, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await installTurnstile(context);
    const page = await context.newPage();
    const providerRequests = [];
    page.on("request", request => { if (["api.igdb.com", "id.twitch.tv"].includes(new URL(request.url()).hostname)) providerRequests.push(request.url()); });
    const errors = collectBrowserErrors(page);
    await mockApis(page, []);
    await page.goto(`${ORIGIN}/gaming`);
    await page.getByRole("heading", { level: 1, name: /Third Railify\s*Gaming/i }).waitFor();
    await dismissPrivacy(page);

    assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), true);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no overflow at ${width}x${height}`);
    assert.equal(await page.locator('.gaming-hero a[href="https://rumble.com/thirdrailifygaming"]').count(), 1);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2200);
    await assertHeroGeometry(page, width, height);
    assert.deepEqual(await page.locator(".gaming-deck__slot b").allTextContents(), gamingRotation().items.map(item => item.title));
    assert.equal(await page.locator(".gaming-deck__count strong").textContent(), "04");
    assert.equal(await page.getByRole("img", { name: "Current Gaming rotation: 4 titles.", exact: true }).count(), 1);
    if (SCREENSHOTS) {
      await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"}));
      await page.screenshot({path:path.join(ARTIFACTS, `hero-${width}x${height}.png`)});
      const hideHeader = await page.addStyleTag({content:".site-header{visibility:hidden!important}"});
      await page.locator(".gaming-hero").screenshot({path:path.join(ARTIFACTS, `hero-section-${width}x${height}.png`)});
      await hideHeader.evaluate(style=>style.remove());
    }
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
    assert.equal(await page.getByRole("link", { name: /Open THE WITCHER 3.* on IGDB/ }).getAttribute("href"), "https://www.igdb.com/games/the-witcher-3-wild-hunt");
    assert.equal(await page.locator('.gaming-card--runes footer > div').count(), 2);
    assert.equal(await page.locator('.gaming-card--luminary footer > div').count(), 1);
    assert.equal(await page.locator('.gaming-card--world footer').count(), 0);
    assert.deepEqual(providerRequests, []);
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
  assert.equal(await page.locator(".gaming-deck__slot").first().evaluate((node) => getComputedStyle(node).animationName), "none");
  assert.equal(await page.locator(".gaming-hero-field__grid").evaluate((node) => getComputedStyle(node).animationName), "none");
  await page.locator('.gaming-deck[data-state="ready"]').waitFor();
  await assertHeroGeometry(page, 1280, 900);
  assert.equal(await page.locator('.gaming-deck__slot path').first().evaluate(node => getComputedStyle(node).strokeDashoffset), "0px");
  assert.equal(await page.locator('.gaming-deck').evaluate(node => getComputedStyle(node).opacity), "1");
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
  {id:"gaming-witcher",title:"THE WITCHER 3: WILD HUNT - COMPLETE EDITION",platform:"PC via Steam",description:"You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract is tracking down Ciri, the Child of Prophecy, a living weapon that can alter the shape of the world.",genre:"RPG GAMES",artworkUrl:"https://gaming-fixture.test/witcher.svg",igdb:{id:"1942",url:"https://www.igdb.com/games/the-witcher-3-wild-hunt"},steam:{appId:"292030",storeUrl:"https://store.steampowered.com/app/292030/"},position:1},
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
      footer: card.querySelector("footer") ? rect(card.querySelector("footer")) : null,
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
    if (item.footer) assert.ok(item.footer.left >= item.card.left - 1 && item.footer.right <= item.card.right + 1 && item.footer.bottom <= item.card.bottom + 1, `${item.title} footer remains reachable inside its card at ${width}x${height}`);
    if (width > 1180) {
      assert.ok(Math.abs(ratio - 3 / 4) <= .01, `${item.title} uses the preferred 3:4 poster frame at ${width}x${height}`);
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
  const expectedPosterFit = "contain";
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

test("IGDB-only card shows its canonical reference with no Steam row or runtime API dependency",async t=>{
  const server=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4207"],{stdio:"ignore"});t.after(()=>server.kill());await waitForServer();const browser=await chromium.launch({executablePath:CHROME,headless:true});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:390,height:844}});const providerRequests=[];page.on("request",request=>{if(["api.igdb.com","id.twitch.tv"].includes(new URL(request.url()).hostname))providerRequests.push(request.url());});
  const item={...gamingRotation().items[0],steam:null};await mockApis(page,[],{rotationItems:[item]});await page.goto(`${ORIGIN}/gaming`);await page.getByRole("link",{name:/Open THE WITCHER 3.* on IGDB/}).waitFor();assert.equal(await page.locator(".gaming-card footer > div").count(),1);assert.equal(await page.locator('.gaming-card a[href*="steampowered"]').count(),0);assert.equal(await page.locator("html").evaluate(element=>element.scrollWidth<=element.clientWidth),true);
  const ratio=await page.locator(".gaming-card__visual").evaluate(element=>{const box=element.getBoundingClientRect();return box.width/box.height;});assert.ok(ratio>=9/16);await page.reload();await page.getByRole("link",{name:/Open THE WITCHER 3.* on IGDB/}).waitFor();assert.deepEqual(providerRequests,[]);
});

async function assertHeroGeometry(page, width, height) {
  const geometry = await page.locator('.gaming-hero').evaluate(hero => {
    const box = node => { const r = node.getBoundingClientRect(); return {left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height}; };
    const word = hero.querySelector('h1 > span');
    const range = document.createRange(); range.selectNodeContents(word);
    const pseudo = getComputedStyle(word, '::after');
    const wordBox = box(word);
    return {
      hero: box(hero), title: box(hero.querySelector('h1')), word:wordBox, glyph:box(range),
      decoration:{left:wordBox.left + parseFloat(pseudo.left), right:wordBox.right - parseFloat(pseudo.right), bottom:wordBox.bottom - parseFloat(pseudo.bottom), top:wordBox.bottom - parseFloat(pseudo.bottom) - parseFloat(pseudo.height)},
      layout:box(hero.querySelector('.gaming-hero__layout')), deck:box(hero.querySelector('.gaming-deck')),
      content:['.gaming-hero__lede','.gaming-actions','.gaming-schedule'].map(selector=>box(hero.querySelector(selector))),
      labels:[...hero.querySelectorAll('.gaming-deck__slot b')].map(box),
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const inside = (a,b) => a.left >= b.left-1 && a.right <= b.right+1 && a.top >= b.top-1 && a.bottom <= b.bottom+1;
  const overlaps = (a,b) => a.left < b.right-1 && a.right > b.left+1 && a.top < b.bottom-1 && a.bottom > b.top+1;
  const label = `${width}x${height}: ${JSON.stringify(geometry)}`;
  assert.equal(geometry.overflow,false,label);
  assert.ok(inside(geometry.title,geometry.hero),label);
  assert.ok(inside(geometry.glyph,geometry.word),'gradient contains the full font range: '+label);
  assert.ok(inside(geometry.decoration,geometry.word),'intrinsic baseline stays within the word: '+label);
  assert.ok(inside(geometry.deck,geometry.layout),label);
  assert.ok(geometry.deck.width >= Math.min(340,width-40),label);
  for(const content of [geometry.title,...geometry.content]) assert.equal(overlaps(content,geometry.deck),false,label);
  for(const content of geometry.content) {
    assert.equal(overlaps(geometry.word,content),false,label);
    assert.equal(overlaps(geometry.decoration,content),false,label);
  }
  for(const labelBox of geometry.labels) assert.ok(inside(labelBox,geometry.deck),label);
  if(width > 960) assert.ok(geometry.deck.bottom <= height+1, 'desktop deck fits below the header: '+label);
  else assert.ok(geometry.deck.top >= geometry.content[2].bottom, 'stacked instrument follows schedule: '+label);
}

test('Rotation deck handles loading, empty, unavailable, long titles and overflow slots truthfully',async t=>{
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4211'],{stdio:'ignore'});
  t.after(()=>server.kill()); await waitForServer('http://127.0.0.1:4211');
  const browser=await chromium.launch({executablePath:CHROME,headless:true});t.after(()=>browser.close());
  if(SCREENSHOTS) await mkdir(ARTIFACTS,{recursive:true});
  for(const [state,options,count] of [
    ['loading',{},0],['empty',{rotationItems:[]},0],['unavailable',{failRotation:true},0],
    ['ready',{rotationItems:[gamingRotation().items[0]]},1],
    ['ready',{rotationItems:Array.from({length:6},(_,index)=>({...gamingRotation().items[0],id:`extra-${index}`,position:index+1,title:`${index+1} / A VERY LONG MANAGED ROTATION TITLE THAT MUST TRUNCATE SAFELY`}))},6],
  ]) {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await installTurnstile(context);const page=await context.newPage();await mockApis(page,[],options);
    if(state==='loading') await page.route('**/api/gaming/rotation',()=>{});
    await page.goto('http://127.0.0.1:4211/gaming');await dismissPrivacy(page);
    await page.locator(`.gaming-deck[data-state="${state}"]`).waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.gaming-deck__slot').count(),Math.min(count,4));
    assert.equal(await page.locator('.gaming-deck__count strong').textContent(),state==='ready'?String(count).padStart(2,'0'):state==='empty'?'00':'—');
    assert.equal(await page.locator('.gaming-hero a[href="https://rumble.com/thirdrailifygaming"]').isVisible(),true);
    if(count===6) assert.equal(await page.locator('.gaming-deck__queue').textContent(),'+2 QUEUED');
    if(state!=='ready') assert.doesNotMatch(await page.locator('.gaming-deck').textContent(),/TITLES ONLINE|INPUT READY|THE WITCHER|LUMINARY/);
    await assertHeroGeometry(page,390,844);
    if(SCREENSHOTS) { const style=await page.addStyleTag({content:'.site-header{visibility:hidden!important}'});await page.locator('.gaming-hero').screenshot({path:path.join(ARTIFACTS,`hero-${state}-${count}-390-reduced.png`)});await style.evaluate(node=>node.remove()); }
    await context.close();
  }
});

test('Hero animation pauses offscreen and when hidden, then resumes without restarting',async t=>{
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4212'],{stdio:'ignore'});t.after(()=>server.kill());await waitForServer('http://127.0.0.1:4212');
  const browser=await chromium.launch({executablePath:CHROME,headless:true});t.after(()=>browser.close());const context=await browser.newContext({viewport:{width:1440,height:900}});await installTurnstile(context);const page=await context.newPage();await mockApis(page,[]);await page.goto('http://127.0.0.1:4212/gaming');await dismissPrivacy(page);
  await page.waitForFunction(()=>document.querySelector('.gaming-hero').dataset.motion==='active');await page.waitForTimeout(2200);
  const animationTime=()=>page.locator('.gaming-hero-field__grid').evaluate(node=>node.getAnimations()[0].currentTime);
  await page.locator('.gaming-close').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.gaming-hero').dataset.motion==='static');
  await page.waitForTimeout(100);const paused=await animationTime();await page.waitForTimeout(150);assert.ok(Math.abs(await animationTime()-paused)<2);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.gaming-hero').dataset.motion==='active');await page.waitForTimeout(100);assert.ok(await animationTime()>paused);
  // Exercise the visibilitychange hook deterministically; Chrome headless has no operator tab switching.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.querySelector('.gaming-hero').dataset.motion==='static');await page.waitForTimeout(100);const hidden=await animationTime();await page.waitForTimeout(150);assert.ok(Math.abs(await animationTime()-hidden)<2);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('.gaming-hero').dataset.motion==='active');
  assert.ok(await animationTime()>=hidden);
});
