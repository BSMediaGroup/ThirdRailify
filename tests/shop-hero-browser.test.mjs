import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";
import { browserFixture } from "./readability-fixtures.mjs";

const ORIGIN = "http://127.0.0.1:4216";
const RESULTS = ".artifacts/shop-hero";
const fixtures = browserFixture(process.cwd(), "featured-merchandising-browser.test.mjs", ORIGIN);

test("Shop hero: responsive deck, authority, motion and interaction", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4216"], { stdio: "ignore" });
  t.after(() => server.kill());
  for (let i = 0; i < 100; i++) { try { if ((await fetch(ORIGIN)).ok) break; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); }
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  t.after(() => browser.close());
  const payload = process.env.SHOP_HERO_SNAPSHOT ? JSON.parse((await readFile(process.env.SHOP_HERO_SNAPSHOT, "utf8")).replace(/^\uFEFF/, "")) : fixtures.catalogue([fixtures.fixtureProduct("first-tee", { featured: true, featuredOrder: 2 }), fixtures.fixtureProduct("second-tee", { featured: true, featuredOrder: 1 }), fixtures.fixtureProduct("third-tee", { featured: true, featuredOrder: 3 })]);
  const selected = payload.products.filter((p) => p.featured && p.images[0]).sort((a,b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER) || a.displayOrder-b.displayOrder || a.id.localeCompare(b.id)).slice(0,3);
  const current = (page) => page.locator(".featured-stage__frame:not(.featured-stage__frame--exiting) .featured-stage__active");
  const assertSlide = async (page, index) => {
    assert.equal(await current(page).getAttribute("href"), `/shop/${selected[index].slug}`);
    assert.equal(await current(page).locator(".featured-stage__details > strong").textContent(), selected[index].title);
    assert.equal(await current(page).locator("img").first().getAttribute("src"), selected[index].images[0]);
    assert.match(await current(page).locator(".commerce-price").innerText(), new RegExp((selected[index].price.minUnitAmount / 100).toFixed(2).replace(".", "\\.")));
    assert.equal(await page.getByRole("link", { name: "Open featured product", exact: true }).getAttribute("href"), `/shop/${selected[index].slug}`);
  };
  for (const width of [2560,1920,1440,1024,768,390]) {
    const { context, page, errors } = await fixtures.fixturePage(browser, width, width === 390 ? 844 : 1080, payload);
    await page.goto(`${ORIGIN}/shop`); await current(page).waitFor(); await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll(".featured-stage img")].every((img) => img.complete && img.naturalWidth > 0));
    assert.deepEqual(await page.locator(".shop-facts strong").allTextContents(), [String(payload.products.length), String(payload.products.reduce((n,p) => n+p.variants.length,0)), "CAD"]);
    await assertSlide(page,0);
    assert.equal(await page.getByRole("button", { name: "Featured product rotation paused for reduced motion" }).isDisabled(),true);
    const geometry = await page.locator(".shop-hero").evaluate((hero) => {
      const box = hero.getBoundingClientRect();
      const elements = [...hero.querySelectorAll(".button-row a, .shop-facts, .featured-stage__active, .featured-stage__console")];
      return { overflow: document.documentElement.scrollWidth > innerWidth, contained: elements.every((el) => { const r=el.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1 && r.top>=box.top && r.bottom<=box.bottom+1; }), fit: [...hero.querySelectorAll(".featured-stage__image img")].every((img) => getComputedStyle(img).objectFit === "contain"), ambient: getComputedStyle(hero.querySelector(".shop-signal__light")).animationName };
    });
    assert.equal(geometry.overflow,false,`${width} overflow`); assert.equal(geometry.contained,true,`${width} containment`); assert.equal(geometry.fit,true); assert.equal(geometry.ambient,"none");
    await page.locator(".shop-hero").screenshot({ path: `${RESULTS}/${process.env.SHOP_HERO_SNAPSHOT ? "live" : "fixture"}-${width}-01.png` });
    await page.getByRole("button", { name: "Next featured product" }).click(); await assertSlide(page,1);
    await page.mouse.move(0,0); await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0,0); });
    if ([1440,390].includes(width)) await page.locator(".shop-hero").screenshot({ path: `${RESULTS}/${process.env.SHOP_HERO_SNAPSHOT ? "live" : "fixture"}-${width}-02.png` });
    assert.deepEqual(Array.from(errors),[]); await context.close();
  }
  const { context, page } = await fixtures.fixturePage(browser,1440,1000,payload);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto(`${ORIGIN}/shop`); await current(page).waitFor();
  await page.waitForFunction(() => document.querySelector('.featured-stage').dataset.running === 'true');
  await page.clock.runFor(7100); await assertSlide(page,1); await page.clock.runFor(800);
  await page.getByRole("button", { name: "Pause featured product rotation" }).click();
  await page.mouse.move(0,0); await page.locator("h1").click();
  await page.clock.runFor(15000); await assertSlide(page,1);
  await page.getByRole("button", { name: "Resume featured product rotation" }).click();
  await page.mouse.move(0,0); await page.locator("h1").click(); await page.clock.runFor(7100); await assertSlide(page,2); await page.clock.runFor(800);
  await current(page).hover(); await page.clock.runFor(14000); await assertSlide(page,2);
  await current(page).focus(); await page.keyboard.press("Tab"); await page.mouse.move(0,0); await page.clock.runFor(14000); await assertSlide(page,2);
  assert.notEqual(await page.getByRole("button", { name: "Previous featured product" }).evaluate((el) => getComputedStyle(el).outlineStyle),"none");
  await page.keyboard.press("Enter"); await assertSlide(page,1);
  await page.getByRole("button", { name: "Next featured product" }).evaluate((button) => { for(let i=0;i<12;i++) button.click(); });
  await page.clock.runFor(800); await assertSlide(page,1);
  await page.locator("h1").click(); await page.mouse.move(0,0);
  await page.evaluate(() => { Object.defineProperty(document,"hidden",{ configurable:true, value:true }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.runFor(15000); await assertSlide(page,1);
  await page.evaluate(() => { Object.defineProperty(document,"hidden",{ configurable:true, value:false }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.runFor(7100); await assertSlide(page,2); await page.clock.runFor(800);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.getByRole("button", { name: "Next featured product" }).click(); await assertSlide(page,0);
  assert.equal(await page.locator(".featured-stage__frame--exiting").count(),0);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.locator("h1").click(); await page.mouse.move(0,0);
  await page.clock.runFor(1000);
  await page.locator(".shop-hero").screenshot({ path: `${RESULTS}/normal-motion-1440.png`, animations: "disabled" });
  await context.close();
  for (const count of [0,1]) {
    const single = fixtures.catalogue(count ? [fixtures.fixtureProduct("only-tee", { featured:true })] : []);
    const { context: edgeContext, page: edgePage } = await fixtures.fixturePage(browser,390,844,single);
    await edgePage.emulateMedia({ reducedMotion:"no-preference" }); await edgePage.clock.install();
    await edgePage.goto(`${ORIGIN}/shop`); await edgePage.locator(count ? '.featured-stage__active[href]' : '.featured-stage [data-featured-state="empty"]').first().waitFor();
    assert.equal(await edgePage.locator('.featured-stage__controls').count(),0);
    await edgePage.clock.runFor(16000);
    assert.equal(await edgePage.locator('.featured-stage').getAttribute('data-running'),'false');
    assert.equal(await edgePage.locator('.featured-stage__frame--exiting').count(),0);
    await edgeContext.close();
  }
});
