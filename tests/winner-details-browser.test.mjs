import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import vm from 'node:vm';
import { chromium } from 'playwright-core';
import { DEFAULT_WHEEL_MECHANICS } from '../src/wheels/mechanics.mjs';
import { FEATURE_PRESETS } from '../src/lib/entrant-appearance.mjs';

const origin = 'http://127.0.0.1:4246', output = '.artifacts/winner-details';
test('completed demo and Stage results show accepted avatar, effective icons and full winner details', async t => {
  const source = await readFile('tests/wheels-v19-browser.test.mjs', 'utf8');
  const fixture = vm.runInNewContext(`${source.slice(source.indexOf('function payload()'), source.indexOf('async function consent('))}; payload()`, { ORIGIN: origin, SLUG: 'winner-details', GIF_ID: 'gif', STATIC_ID: 'static', GIF: Buffer.alloc(0), Buffer });
  const entry = { ...fixture.wheel.entries[0], label: 'Radio Baloney with a complete long participant name', identity: { version: 1, type: 'gift', origin: 'automation' }, weight: 17, style: null, avatarUrl: 'https://cdn.thirdrailify.com/winner-fixture.svg', appearance: { version: 1, automatic: Object.fromEntries(Object.entries(FEATURE_PRESETS.gift.components).map(([key, value]) => [key, { value, source: 'automation' }])), manual: { icons: ['star', 'coin'] } } };
  fixture.wheel.entries = [entry]; fixture.wheel.participantCount = 1; fixture.wheel.media = { centre: null, background: null, segmentFills: [] };
  fixture.wheel.config.entrantDisplay = 'names'; fixture.wheel.config.spinDurationMs = 1800;
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4246'], { stdio: 'ignore' }); t.after(() => server.kill());
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* startup */ } await new Promise(r => setTimeout(r, 100)); }
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true }); t.after(() => browser.close());
  const evidence = [];
  for (const width of [1920, 1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1080 }, reducedMotion: width === 1440 ? 'no-preference' : 'reduce' }); const page = await context.newPage();
    let fallback = false; const errors = [], writes = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://cdn.thirdrailify.com/winner-fixture.svg', route => fallback ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120"><rect width="80" height="120" fill="#176b56"/><circle cx="40" cy="35" r="23" fill="#ffd467"/><path d="M6 120V94a34 34 0 0168 0v26" fill="#ffd467"/></svg>' }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname; if (route.request().method() !== 'GET' && path.startsWith('/api/wheels')) writes.push(path);
      const payload = structuredClone(fixture); if (fallback) payload.wheel.entries[0].appearance.manual.icons = [];
      let body = payload;
      if (path === '/api/auth/config') body = { configured: true, publicOrigin: origin, adminOrigin: origin, oauthProviders: [], oauthProviderStates: [] };
      else if (path === '/api/auth/session') body = { ok: true, authenticated: false };
      else if (path === '/api/wheels/access') body = { ok: true, authenticated: false, canCreate: false };
      else if (path === '/api/wheels/mechanics') body = { ok: true, revision: 1, mechanics: DEFAULT_WHEEL_MECHANICS };
      else if (path === '/api/wheels') body = { ok: true, items: [] };
      else if (path === '/api/wheels/stages/winner-stage') body = { ok: true, stage: { slug: 'winner-stage', title: 'Winner details Stage', visibility: 'public', lifecycle: 'active', revision: 1, wheels: [0, 1].map(position => ({ position, unavailable: false, wheel: { ...payload.wheel, slug: `winner-${position}` }, access: payload.access })) }, access: { canEdit: false } };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    for (const stage of width === 1440 || width === 390 ? [false, true] : [false]) {
      await page.goto(`${origin}/wheels/${stage ? 'stages/winner-stage' : `winner-details${width === 768 ? '/present' : ''}`}`, { waitUntil: 'networkidle' });
      const reject = page.getByRole('button', { name: /Reject non-essential/i }); if (await reject.count()) await reject.click();
      await page.getByRole('button', { name: stage ? 'SPIN ALL' : 'Start demo spin', exact: true }).click();
      const dialog = page.locator('.winner-dialog'); await dialog.waitFor(); const details = dialog.locator('.winner-entrant'); assert.equal(await details.count(), stage ? 2 : 1);
      for (const block of await details.all()) {
        assert.equal(await block.locator('.winner-entrant__full-name dd').textContent(), entry.label);
        assert.equal(await block.locator('.winner-entrant__icons svg').count(), 2);
        assert.equal(await block.locator('.entrant-avatar img').evaluate(img => img.complete && img.naturalWidth > 0), true);
        assert.match(await block.locator('.winner-entrant__facts').textContent(), /Entry weight17/);
        assert.match(await block.locator('.winner-entrant__facts').textContent(), /star, coin/);
        assert.equal(await block.locator('.winner-entrant__entry-type dd').textContent(), 'Gift purchase / Automatic');
        const geometry = await block.evaluate(el => { const row = el.querySelector('.winner-entrant__identity'), name = el.querySelector('.winner-entrant__name'), avatar = el.querySelector('.entrant-avatar'); return { rowOverflow: row.scrollWidth - row.clientWidth, whiteSpace: getComputedStyle(name).whiteSpace, avatarWidth: avatar.clientWidth, avatarHeight: avatar.clientHeight }; });
        assert.ok(geometry.rowOverflow <= 1); assert.equal(geometry.whiteSpace, 'nowrap'); assert.equal(geometry.avatarWidth, geometry.avatarHeight); evidence.push({ width, stage, geometry });
      }
      assert.ok(await dialog.evaluate(el => el.scrollWidth - el.clientWidth <= 1));
      await page.screenshot({ path: `${output}/${stage ? 'stage' : 'winner'}-${width}.png` });
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    }
    if (width === 390) {
      fallback = true; await page.goto(`${origin}/wheels/winner-details`, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Start demo spin', exact: true }).click();
      const dialog = page.locator('.winner-dialog'); await dialog.waitFor(); assert.equal(await dialog.locator('.winner-entrant__icons').count(), 0);
      await dialog.locator('.entrant-avatar > svg').waitFor(); await dialog.getByRole('button', { name: 'Close result', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(writes, []); assert.deepEqual(errors, []); await context.close();
  }
  await writeFile(`${output}/geometry.json`, JSON.stringify(evidence, null, 2));
});
