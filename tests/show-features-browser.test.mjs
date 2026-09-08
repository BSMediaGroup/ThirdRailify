import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const origin = 'http://127.0.0.1:4257';
test('homepage vector scenes animate only when visible, respect reduced motion and link whole cards', async t => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4257'], { stdio: 'ignore' }); t.after(() => server.kill());
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* startup */ } await new Promise(r => setTimeout(r, 100)); }
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true }); t.after(() => browser.close());
  await mkdir('.artifacts/show-features', { recursive: true }); const results = [];
  for (const width of [1920, 1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' }); const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const body = path === '/api/auth/config' ? { configured: false, oauthProviders: [], oauthProviderStates: [] }
        : path === '/api/auth/session' ? { ok: true, authenticated: false, account: null }
        : path === '/api/watch' ? { available: false, liveNow: [], primary: null, latestByPlatform: {}, freshness: 'unavailable' }
        : path === '/api/commerce/catalogue' ? { ok: true, products: [], collections: [], currency: 'CAD', checkoutEnabled: false }
        : path === '/api/catalogue/banner' ? { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } }
        : { ok: true, items: [], rates: { CAD: 1 } };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(origin, { waitUntil: 'networkidle' });
    const consent = page.getByRole('button', { name: /Reject non-essential/ }); if (await consent.count()) await consent.click();
    const section = page.locator('.universe-section'), links = section.locator('.show-feature-link');
    assert.equal(await links.count(), 3); assert.equal(await section.locator('img,svg image,canvas').count(), 0);
    assert.deepEqual(await links.evaluateAll(elements => elements.map(e => e.getAttribute('href'))), ['/polls/abootnothing', '/about', '/about']);
    const snapshots = [];
    for (let i = 0; i < 3; i++) {
      const art = links.nth(i).locator('.show-art'); await art.scrollIntoViewIfNeeded(); await page.waitForFunction(index => document.querySelectorAll('.show-art')[index]?.dataset.motion === 'active', i);
      const animated = art.locator(i === 0 ? '.show-art__mic-left' : i === 1 ? '.show-art__punch-left' : '.show-art__radio circle').first();
      const before = await animated.evaluate(e => e.getAnimations()[0].currentTime); await page.waitForTimeout(180); const after = await animated.evaluate(e => e.getAnimations()[0].currentTime); assert.ok(after > before);
      await page.keyboard.press('Tab'); await links.nth(i).focus(); assert.equal(await links.nth(i).evaluate(e => e.matches(':focus-visible')), true);
      snapshots.push(await links.nth(i).evaluate(e => ({ width: e.clientWidth, overflow: e.scrollWidth - e.clientWidth, height: e.clientHeight })));
    }
    assert.ok(snapshots.every(s => s.overflow <= 1)); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => document.activeElement?.blur());
    await section.screenshot({ style: '.site-header,.skip-link { visibility:hidden !important; }', path: `.artifacts/show-features/cards-${width}.png` });
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForFunction(() => [...document.querySelectorAll('.show-art')].every(e => e.dataset.motion === 'static'));
    assert.equal(await page.locator('.show-art__mic-left').evaluate(e => getComputedStyle(e).animationPlayState), 'paused');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await section.scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.show-art__mic-left').evaluate(e => getComputedStyle(e).animationName), 'none');
    assert.ok(await page.locator('.show-art').evaluateAll(es => es.every(e => e.dataset.motion === 'static')));
    assert.deepEqual(errors, []); results.push({ width, cards: snapshots, motion: true, reducedMotion: true, offscreenPaused: true });
    if (width === 1440) { await links.first().focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/polls/abootnothing'); }
    if (width === 390) { await links.nth(1).click(); await page.waitForURL('**/about'); await page.goto(origin); await page.locator('.show-feature-link').nth(2).click(); await page.waitForURL('**/about'); }
    await context.close();
  }
  await writeFile('.artifacts/show-features/geometry.json', JSON.stringify(results, null, 2));
});
