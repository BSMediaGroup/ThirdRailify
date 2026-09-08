// Local, opt-in headed production-preview probe. Never connects to a live API.
/* global document, window, devicePixelRatio, visualViewport, screen */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from 'playwright-core';
import { DEFAULT_WHEEL_MECHANICS } from '../src/wheels/mechanics.mjs';

const origin = process.env.WHEEL_PROFILE_ORIGIN || 'http://127.0.0.1:4196';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Profiling requires a loopback production preview');
const label = process.argv[2] || 'before';
const traced = process.argv.includes('--trace');
const output = `.artifacts/wheel-render-performance/${label}`;
await mkdir(output, { recursive: true });
const publicFixture = process.env.WHEEL_PUBLIC_FIXTURE ? JSON.parse(await readFile(process.env.WHEEL_PUBLIC_FIXTURE, 'utf8')) : null;
const publicMechanics = publicFixture ? JSON.parse(await readFile('.artifacts/wheel-render-performance/mechanics-public.json', 'utf8')) : null;
// Reuse the maintained renderer fixture without registering its test suite.
const source = await readFile('tests/wheels-v19-browser.test.mjs', 'utf8');
const fixture = vm.runInNewContext(`${source.slice(source.indexOf('function payload()'), source.indexOf('async function consent('))}; ({payload,orientationSvg,twoFrameGif})`, {
  ORIGIN: origin, SLUG: 'v19-render-stability', Buffer,
  GIF_ID: '11111111-1111-4111-8111-111111111111', STATIC_ID: '22222222-2222-4222-8222-222222222222', GIF: Buffer.alloc(0),
});
const browser = await chromium.launch({ executablePath: process.env.WHEEL_BROWSER || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe', headless: false });
try {
  const browserSession = await browser.newBrowserCDPSession();
  const system = await browserSession.send('SystemInfo.getInfo');
  await writeFile(`${output}/environment.json`, JSON.stringify({ browser: await browser.version(), gpu: system.gpu, commandLine: system.commandLine, viewport: { width: 1440, height: 900 }, trace: traced }, null, 2));
  const scenarios = process.env.WHEEL_SCENARIO ? [process.env.WHEEL_SCENARIO] : ['normal', 'large', 'stage'];
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(process.argv.includes('--record') ? { recordVideo: { dir: output, size: { width: 1440, height: 900 } } } : {}) });
    const page = await context.newPage();
    const errors = []; const requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => requests.push({ at: Date.now(), method: r.method(), url: r.url() }));
    await context.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) return route.abort();
      if (u.pathname === '/local-wheel-centre.jpg') return route.fulfill({ contentType: 'image/jpeg', body: await readFile('.artifacts/wheel-render-performance/donations-centre.jpg') });
      if (!u.pathname.startsWith('/api/')) return route.continue();
      if (u.pathname.endsWith('static-v19')) return route.fulfill({ contentType: 'image/svg+xml', body: fixture.orientationSvg() });
      if (u.pathname.endsWith('gif-v19')) return route.fulfill({ contentType: 'image/gif', body: fixture.twoFrameGif() });
      if (!['GET', 'HEAD'].includes(route.request().method()) && u.pathname.startsWith('/api/wheels')) throw new Error('Unexpected Wheel write');
      let body = { ok: true };
      const payload = publicFixture ? structuredClone(publicFixture) : fixture.payload();
      if (publicFixture) payload.wheel.media.centre.url = `${origin}/local-wheel-centre.jpg`;
      else payload.wheel.config.spinDurationMs = 10000;
      // Preserve the fixture's appearance; exercise an ordinary and a larger supported list.
      if (scenario === 'large') {
        payload.wheel.entries = Array.from({ length: 250 }, (_, i) => ({ ...payload.wheel.entries[i % 8], id: `entrant-${i}`, order: i, label: `Participant ${i + 1}` }));
        payload.wheel.participantCount = 250;
      }
      if (u.pathname === '/api/auth/config') body = { configured: true, oauthProviders: [], oauthProviderStates: [], publicOrigin: origin, adminOrigin: origin };
      else if (u.pathname === '/api/auth/session') body = { ok: true, authenticated: false };
      else if (u.pathname === '/api/wheels/mechanics') body = publicMechanics || { ok: true, revision: 12, mechanics: DEFAULT_WHEEL_MECHANICS };
      else if (u.pathname === '/api/wheels/access') body = { ok: true, authenticated: false, canCreate: false };
      else if (u.pathname === '/api/wheels') body = { ok: true, items: [], count: 0 };
      else if (u.pathname === '/api/wheels/stages/performance') body = { ok: true, stage: { id: 'stage-local', slug: 'performance', title: 'Local rendering profile', description: '', visibility: 'public', lifecycle: 'active', revision: 1, wheels: [0, 1].map(i => ({ position: i, unavailable: false, wheel: { ...payload.wheel, id: `wheel-${i}`, slug: `profile-${i}` }, access: { role: 'viewer', canEdit: false, canSpinOfficially: false } })) }, access: { isOwner: false, canEdit: false } };
      else if (u.pathname.startsWith('/api/wheels/')) body = payload;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await context.addInitScript(() => {
      const rawRaf = window.requestAnimationFrame.bind(window);
      const rawStyle = window.getComputedStyle.bind(window);
      const probe = window.__wheelProbe = { running: false, callbacks: [], reads: [], commits: [], frames: [], long: [], resizes: 0 };
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => 1, onCommitFiberRoot: () => { if (probe.running) probe.commits.push(performance.now()); }, onCommitFiberUnmount: () => {} };
      window.requestAnimationFrame = callback => rawRaf(now => {
        if (!probe.running) return callback(now);
        const start = performance.now(); callback(now);
        probe.callbacks.push([now, performance.now() - start]);
      });
      window.getComputedStyle = (...args) => {
        const start = performance.now(); const result = rawStyle(...args);
        if (probe.running && args[0]?.classList?.contains('wheel-stage__rotor')) {
          // Force the same property the existing consumer reads, so timing includes style resolution.
          void result.transform; probe.reads.push([start, performance.now() - start]);
        }
        return result;
      };
      for (const type of ['longtask', 'long-animation-frame']) {
        if (PerformanceObserver.supportedEntryTypes.includes(type)) new PerformanceObserver(list => {
          if (probe.running) probe.long.push(...list.getEntries().map(e => e.toJSON()));
        }).observe({ type, buffered: false });
      }
      window.__beginWheelProbe = () => {
        probe.running = true; probe.callbacks = []; probe.reads = []; probe.commits = []; probe.frames = []; probe.long = [];
        let previous = 0;
        const sample = now => {
          if (!probe.running) return;
          const canvas = document.querySelector('.wheel-stage canvas');
          const spin = canvas?.__wheelSpinV110;
          if (spin && !spin.completed) { if (previous) probe.frames.push([now - spin.startAt, now - previous]); previous = now; }
          rawRaf(sample);
        }; rawRaf(sample);
      };
    });
    const now = Date.now();
    await context.addCookies([{ name: 'thirdrailify_consent', value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2592000000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: origin }]);
    await page.goto(`${origin}/wheels/${scenario === 'stage' ? 'stages/performance' : 'v19-render-stability'}`, { waitUntil: 'networkidle' });
    await page.bringToFront();
    await page.locator('.wheel-stage canvas').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const centerWheel = () => page.evaluate(() => {
      const box = document.querySelector('.wheel-stage').getBoundingClientRect();
      window.scrollTo({ top: box.top + window.scrollY - Math.max(76, (window.innerHeight - box.height) / 2), behavior: 'instant' });
    });
    if (process.argv.includes('--centre') && scenario !== 'stage') await centerWheel();
    const environment = await page.evaluate(() => ({ visibility: document.visibilityState, dpr: devicePixelRatio, zoom: visualViewport.scale, screen: { width: screen.width, height: screen.height }, wheels: [...document.querySelectorAll('.wheel-stage canvas')].filter(c => c.__wheelRendererV19).map(c => ({ css: c.__wheelRendererV19.size, backing: c.width, entrants: c.__wheelRendererV19.plan.segments.length, hostBox: c.closest('.wheel-stage').getBoundingClientRect().toJSON() })) }));
    await writeFile(`${output}/${scenario}-environment.json`, JSON.stringify(environment, null, 2));
    if (process.argv.includes('--visual')) {
      for (const [name, angle] of [['idle', 0], ['mid-angle', 137.5], ['settled-angle', 281.25]]) {
        await page.evaluate(({ angle, name }) => {
          const rotor = document.querySelector('.wheel-stage__rotor');
          rotor.style.transform = `rotate(${angle}deg)`;
          rotor.closest('.wheel-stage').classList.toggle('is-spinning', name === 'mid-angle');
        }, { angle, name });
        await page.locator('.wheel-stage').first().screenshot({ path: `${output}/${scenario}-${name}.png`, animations: 'disabled' });
        await page.screenshot({ path: `${output}/${scenario}-${name}-page.png`, fullPage: true, animations: 'disabled' });
      }
      await context.close();
      continue;
    }
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    for (let repeat = 0; repeat < (traced ? 1 : Number(process.env.WHEEL_REPEATS || 3)); repeat++) {
      const before = await session.send('Performance.getMetrics');
      const startTrace = () => session.send('Tracing.start', { categories: 'devtools.timeline,v8,blink,cc,gpu,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-v8.gc', transferMode: 'ReturnAsStream' });
      if (traced && !publicFixture) await startTrace();
      await page.evaluate(() => window.__beginWheelProbe());
      if (process.argv.includes('--centre') && scenario !== 'stage') await centerWheel();
      const button = scenario === 'stage' ? page.getByRole('button', { name: /spin all/i }).first() : process.argv.includes('--centre') ? page.getByRole('button', { name: 'Spin wheel from centre', exact: true }) : page.getByRole('button', { name: 'Start demo spin' });
      await button.click();
      await page.waitForFunction(() => [...document.querySelectorAll('.wheel-stage canvas')].some(c => c.__wheelSpinV110 && !c.__wheelSpinV110.completed));
      let traceSaved = false;
      const saveTrace = async () => {
        const complete = new Promise(resolve => session.once('Tracing.tracingComplete', resolve));
        await session.send('Tracing.end'); const { stream } = await complete;
        let trace = ''; for (;;) { const part = await session.send('IO.read', { handle: stream }); trace += part.data; if (part.eof) break; }
        await session.send('IO.close', { handle: stream }); await writeFile(`${output}/${scenario}-trace.json`, trace);
        traceSaved = true;
      };
      if (traced && publicFixture) {
        await page.waitForTimeout(36000); await startTrace();
        await page.waitForTimeout(14000); await saveTrace();
      }
      await page.waitForFunction(() => [...document.querySelectorAll('.wheel-stage canvas')].filter(c => c.__wheelSpinV110).every(c => c.__wheelSpinV110.completed), null, { timeout: 70000 });
      const evidence = await page.evaluate(() => {
        window.__wheelProbe.running = false;
        return { probe: window.__wheelProbe, spins: [...document.querySelectorAll('.wheel-stage canvas')].filter(c => c.__wheelSpinV110).map(c => ({ spin: c.__wheelSpinV110, renderer: c.__wheelRendererV19 })), heap: performance.memory?.usedJSHeapSize };
      });
      if (traced && !traceSaved) await saveTrace();
      const after = await session.send('Performance.getMetrics');
      await writeFile(`${output}/${scenario}-${repeat}.json`, JSON.stringify({ environment, evidence, before, after, errors, requests }, null, 2));
      console.log(`${label} ${scenario} ${repeat}: ${evidence.probe.frames.length} callback intervals, ${evidence.probe.reads.length} rotor style reads, ${evidence.probe.commits.length} React commits`);
      const close = page.getByRole('button', { name: 'Close result', exact: true });
      if (await close.count()) await close.click();
      if (scenario === 'stage') {
        await page.getByRole('dialog', { name: 'WINNERS LOCKED.' }).waitFor();
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(350);
    }
    await context.close();
  }
} finally { await browser.close(); }
