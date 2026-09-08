import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { featureFixture } from '../../ThirdRailify-Admin/tests/entrant-features-fixture.mjs';
import { saveWheel, createWheel, getPublicWheelMechanics } from '../../ThirdRailify-Admin/functions/_shared/wheels-core.js';
import { wheelAutomations } from '../../ThirdRailify-Admin/functions/_shared/wheel-automations.js';
import { createPortableWheel, parseWheelImport } from '../src/wheels/portable.mjs';
import { FEATURE_PRESETS, effectiveAppearance } from '../src/lib/entrant-appearance.mjs';

const origin = 'http://127.0.0.1:4228', output = '.artifacts/entrant-features';
test('real local awards render, participant overrides persist and shared surfaces retain features', async t => {
  const f = await featureFixture(); t.after(f.h.dispose); const { env, rules, event, send, read, slug } = f;
  for (const [i, rule] of rules.entries()) await send(event(rule, ['Subscriber', 'Raid', 'Gift', 'Rant'][i]));
  const initial = await read();
  const longName = 'Raid entrant with a very long name that must stay on one line';
  await saveWheel(env, 'creator', slug, { ...initial.wheel, entries: [...initial.wheel.entries.map(e => e.label === 'Raid' ? { ...e, label: longName } : e), { label: 'Narrow slice', weight: 1, appearance: { version: 1, manual: FEATURE_PRESETS.gift.components } }] });
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4228'], { stdio: 'ignore' }); t.after(() => server.kill());
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* startup */ } await new Promise(r => setTimeout(r, 100)); }
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true }); t.after(() => browser.close());
  for (const width of [1920, 1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1080 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      try {
        if (path === '/api/auth/config') return json({ configured: true, publicOrigin: origin, adminOrigin: origin, oauthProviders: [], oauthProviderStates: [], environment: 'test' });
        if (path === '/api/auth/session') return json({ ok: true, authenticated: true, csrfToken: 'fixture', access: { isAdmin: false, isMasterAdmin: false }, account: { id: 'creator', email: 'creator@example.test', displayName: 'Creator', avatarUrl: null, providers: ['email'], role: 'user', status: 'active', emailVerified: true } });
        if (path === '/api/wheels/mechanics') return json(await getPublicWheelMechanics(env));
        if (path === '/api/wheels/access') return json({ ok: true, authenticated: true, canCreate: true });
        if (path === '/api/wheels' && method === 'POST') return json(await createWheel(env, 'creator', route.request().postDataJSON()));
        if (path === `/api/wheels/${slug}`) return json(method === 'PUT' ? await saveWheel(env, 'creator', slug, route.request().postDataJSON()) : await read());
        if (path === '/api/wheels/stages/feature-stage') { const payload = await read(); return json({ ok: true, stage: { slug: 'feature-stage', title: 'Feature Stage', visibility: 'public', lifecycle: 'active', revision: 1, wheels: [0, 1].map(position => ({ position, reference: slug, unavailable: false, wheel: payload.wheel, access: payload.access })) }, access: { isOwner: true, isMasterAdmin: false, canEdit: true, revision: 1 } }); }
        if (path.includes('/automations')) return json(await wheelAutomations(env, 'creator', slug, method === 'GET' ? 'read' : path.split('/').at(-1), method === 'GET' ? { ruleId: new URL(route.request().url()).searchParams.get('ruleId') || '' } : route.request().postDataJSON()));
        return json({ ok: true, items: [] });
      } catch (e) { return json({ message: e.message, issues: e.issues }, e.status || 400); }
    });
    await page.goto(`${origin}/wheels/${slug}`, { waitUntil: 'networkidle' });
    const consent = page.getByRole('button', { name: /Reject non-essential/i }); if (await consent.count()) await consent.click();
    await page.waitForFunction(() => document.querySelector('.wheel-stage__face')?.__wheelRendererV19?.plan?.segments.length === 5);
    await page.locator('.wheel-stage').first().scrollIntoViewIfNeeded();
    const rendered = await page.locator('.wheel-stage__face').evaluate(c => c.__wheelRendererV19.plan.segments.map(s => ({ label: s.entry.label, span: s.span, appearance: s.entry.appearance, labelVisible: s.label.visible })));
    assert.equal(rendered.filter(s => s.appearance).length, 5); assert.ok(rendered[0].span > Math.PI); assert.ok(rendered.at(-1).span < .04);
    const labels = await page.locator('.wheel-stage__face').evaluate(c => c.__wheelRendererV19.featureLabels);
    for (const label of labels) { assert.equal(label.glyphBaseline, label.textBaseline); assert.ok(label.width <= label.maxWidth); assert.doesNotMatch(label.text, /[\r\n]/); }
    if (width === 1920) {
      const longEntry = (await read()).wheel.entries.find(e => e.label === longName); const label = labels.find(l => l.id === longEntry.id);
      assert.equal(label.glyphs, 1); assert.ok(label.text.endsWith('…'), 'name truncates before a configured glyph is sacrificed');
      const point = await page.locator('.wheel-stage__face').evaluate((c, id) => { const p = c.__wheelRendererV19.plan, s = p.segments.find(s => s.entry.id === id), b = c.getBoundingClientRect(); return { x: b.x + p.centre + Math.cos(s.radialAngle) * p.radius * .75, y: b.y + p.centre + Math.sin(s.radialAngle) * p.radius * .75 }; }, longEntry.id);
      await page.mouse.click(point.x, point.y); await page.getByRole('heading', { name: longName, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close participant details', exact: true }).click();
    }
    await page.screenshot({ path: `${output}/public-wedges-${width}.png`, fullPage: false });
    if (width === 390) assert.equal(await page.locator('.wheel-stage__feature-effects').getAttribute('data-feature-reduced'), 'true');
    if (width === 1920) {
      const fx = page.locator('.wheel-stage__feature-effects');
      await page.locator('.wheel-stage').evaluate(el => { el.style.display = 'none'; });
      await page.waitForTimeout(150); const stopped = await fx.evaluate(c => c.__wheelFeatureMetrics.draws);
      await page.waitForTimeout(150); assert.equal(await fx.evaluate(c => c.__wheelFeatureMetrics.draws), stopped, 'offscreen decoration stops');
      await page.locator('.wheel-stage').evaluate(el => { el.style.display = ''; });
      await page.waitForFunction(count => document.querySelector('.wheel-stage__feature-effects').__wheelFeatureMetrics.draws > count, stopped);
    }
    await page.getByRole('button', { name: 'Manage participants', exact: true }).click();
    const manager = page.locator('.participant-manager'); const first = manager.locator('.participant-row').first();
    assert.match(await first.textContent(), /Subscription \/ Automatic/);
    await first.getByRole('button', { name: 'Features', exact: true }).click();
    const controls = first.locator('.entrant-appearance');
    await controls.getByLabel('Feature fill', { exact: true }).selectOption('gradient');
    await controls.getByLabel('Gradient 1', { exact: true }).fill('#123456'); await controls.getByLabel('Gradient 2', { exact: true }).fill('#654321');
    await controls.getByLabel('Feature icons', { exact: true }).selectOption('none'); await controls.getByLabel('Feature effects', { exact: true }).selectOption('none');
    await controls.scrollIntoViewIfNeeded(); await manager.screenshot({ path: `${output}/participant-controls-${width}.png` });
    if (await manager.getByRole('button', { name: 'Save participants', exact: true }).isEnabled()) { await manager.getByRole('button', { name: 'Save participants', exact: true }).click(); await page.getByText('Authoritative participant revision saved.', { exact: true }).waitFor(); }
    const beforeAward = (await read()).wheel.entries[0].weight;
    await manager.getByRole('button', { name: 'Close participant manager', exact: true }).click();
    await send(event(rules[0], 'Subscriber')); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(weight => document.querySelector('.wheel-stage__face')?.__wheelRendererV19?.plan?.segments.find(s => s.entry.label === 'Subscriber')?.entry.weight === weight, beforeAward + 150);
    await page.reload({ waitUntil: 'networkidle' });
    const saved = (await read()).wheel.entries.find(e => e.label === 'Subscriber'); assert.equal(saved.weight, beforeAward + 150); assert.deepEqual(effectiveAppearance(saved).fill.colors, ['#123456', '#654321']); assert.deepEqual(effectiveAppearance(saved).icons, []); assert.equal(effectiveAppearance(saved).effects, null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); assert.deepEqual(errors, []);
    if (width === 1440) {
      await page.goto(`${origin}/wheels/${slug}/edit`, { waitUntil: 'networkidle' });
      const editor = page.locator('.wheel-editor-dialog'); await editor.getByRole('tab', { name: 'automations', exact: true }).click();
      await editor.locator('.automation-card').first().waitFor(); assert.equal(await editor.locator('.automation-card').count(), 4);
      await editor.locator('.automation-card').first().getByRole('button', { name: 'Edit', exact: true }).click();
      const ruleForm = editor.getByRole('form', { name: 'Automation rule editor' }); await ruleForm.locator('.entrant-appearance').scrollIntoViewIfNeeded();
      await ruleForm.getByLabel('Feature effects', { exact: true }).selectOption('selected'); await editor.screenshot({ path: `${output}/public-automation-editor.png` });
      await ruleForm.getByRole('button', { name: 'Save and enable', exact: true }).click(); await ruleForm.waitFor({ state: 'hidden' });
      const refreshed = await wheelAutomations(env, 'creator', slug, 'read', {}); for (const rule of rules) Object.assign(rule, refreshed.rules.find(r => r.id === rule.id));
      await page.goto(`${origin}/wheels/${slug}/present`, { waitUntil: 'networkidle' }); await page.locator('.wheel-stage__feature-effects').waitFor(); await page.screenshot({ path: `${output}/presentation.png` });
      await page.goto(`${origin}/wheels/stages/feature-stage`, { waitUntil: 'networkidle' }); await page.locator('.wheel-stage__face').first().waitFor(); assert.equal(await page.locator('.wheel-stage__feature-effects').count(), 2);
      const giftBefore = (await read()).wheel.entries.find(e => e.label === 'Gift').weight; await send(event(rules[2], 'Gift')); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(weight => [...document.querySelectorAll('.wheel-stage__face')].every(c => c.__wheelRendererV19?.plan?.segments.find(s => s.entry.label === 'Gift')?.entry.weight === weight), giftBefore + 20);
      await page.screenshot({ path: `${output}/stage-final.png` });
      await page.goto(`${origin}/wheels/new`, { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: 'Participant features', exact: true }).waitFor();
    }
    if (width === 390) {
      await page.getByRole('button', { name: 'Manage participants', exact: true }).click();
      await manager.getByLabel('Quick-add participant', { exact: true }).fill('Manual new entrant');
      await manager.getByRole('button', { name: 'Add', exact: true }).click();
      const added = manager.locator('.participant-row').last(); await added.getByRole('button', { name: 'Features', exact: true }).click();
      await added.locator('.feature-presets button').nth(2).click();
      await added.getByLabel('Feature icons', { exact: true }).selectOption('none');
      await added.getByLabel('Weight', { exact: true }).fill('3');
      await added.getByLabel('Label', { exact: true }).fill('Manual renamed entrant');
      await added.getByRole('button', { name: 'Move Manual renamed entrant up', exact: true }).click();
      await manager.getByRole('button', { name: 'Save participants', exact: true }).click();
      await page.getByText('Authoritative participant revision saved.', { exact: true }).waitFor();
      await manager.getByRole('button', { name: 'Close participant manager', exact: true }).click(); await page.reload({ waitUntil: 'networkidle' });
      const fresh = (await read()).wheel.entries; const manual = fresh.find(e => e.label === 'Manual renamed entrant');
      assert.deepEqual(manual.identity, { version: 1, type: 'regular', origin: 'manual' });
      assert.equal(manual.weight, 3); assert.equal(manual.order, fresh.length - 2); assert.deepEqual(effectiveAppearance(manual).fill, FEATURE_PRESETS.gift.components.fill); assert.deepEqual(effectiveAppearance(manual).icons, []);
    }
    await context.close();
  }
  const payload = await read(); const portable = await createPortableWheel(payload.wheel); const imported = await parseWheelImport(JSON.stringify(portable), { sourceName: 'features.twl' });
  const subscriber = imported.proposals[0].entries.find(e => e.label === 'Subscriber'); assert.deepEqual(effectiveAppearance(subscriber).fill.colors, ['#123456', '#654321']);
  await writeFile(`${output}/final-public-readback.json`, JSON.stringify(payload, null, 2));
});
