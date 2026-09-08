import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as engine from '../src/wheels/engine.mjs';
import * as mechanics from '../src/wheels/mechanics.mjs';
import * as renderPlan from '../src/wheels/wheelRenderPlan.mjs';

const source = await readFile(new URL('../src/wheels/WheelCanvas.tsx', import.meta.url), 'utf8');
const entries = [1, 8, 3, 2].map((weight, i) => ({ id: `entry-${i}`, label: `Participant ${i}`, state: 'active', weight, order: i }));
const config = { pointerAccent: '#F3C928', entrantDisplay: 'names' };
const plan = { ...engine.spinPlan(entries, entries[2].id, 10000, 73.25, { landingFraction: .318, turnRandom: .64 }), startAt: 100, id: 'deterministic-local' };

// Run the actual component's effects with a deterministic RAF queue. Canvas
// artwork is covered by the headed/browser suites; skip only its first effect.
function mount(componentSource = source, overrides = {}) {
  const effects = []; const refs = []; const queue = new Map(); const targets = []; const ticks = [];
  let nextId = 0; let now = 0; let completed = 0;
  const dom = {};
  const createElement = (tag, props, ...children) => {
    const node = { tag, style: { ...props?.style }, dataset: {}, children, ...props };
    if (props?.ref) { props.ref.current = node; dom[props.className?.split(' ')[0] || tag] = node; }
    return node;
  };
  const context = {
    ...engine, ...mechanics, ...renderPlan, React: { createElement },
    WheelAvatarLayer: () => null, WheelsBrandMark: () => null,
    pointerAccentShades: () => ({}),
    useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
    useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
    performance: { now: () => now },
    requestAnimationFrame: callback => { queue.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => queue.delete(id),
    getComputedStyle: () => { throw new Error('Frame driver must not read computed styles'); },
  };
  if (componentSource !== source) {
    context.getComputedStyle = node => ({ transform: node.style.transform });
    context.DOMMatrixReadOnly = class { constructor(value) { const angle = Number(value.match(/rotate\((.*?)deg\)/)[1]) * Math.PI / 180; this.a = Math.cos(angle); this.b = Math.sin(angle); } };
  }
  const compiled = ts.transpileModule(componentSource.replace(/^import .*;\r?\n/gm, '').replace('export function WheelCanvas', 'function WheelCanvas'), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const component = vm.runInNewContext(`${compiled}\nWheelCanvas`, context);
  component({ entries, config, rotation: plan.finalRotation, durationMs: plan.durationMs, spinning: true, animation: plan, onSpinEnd: () => completed++, onBoundaryCrossing: count => ticks.push(count), onPointerTargetChange: entry => targets.push(entry?.id), ...overrides });
  const cleanups = effects.slice(1).map(fn => fn());
  const rotor = dom['wheel-stage__rotor']; const canvas = dom['wheel-stage__face'];
  return {
    queue, targets, ticks, rotor, canvas,
    step(time) { now = time; const pending = [...queue.values()]; queue.clear(); for (const fn of pending) fn(time); return Number(rotor.style.transform.match(/rotate\((.*?)deg\)/)[1]); },
    stop() { for (const cleanup of cleanups) cleanup?.(); },
    get completed() { return completed; },
  };
}

for (const [name, times] of [
  ['60 Hz', Array.from({ length: 610 }, (_, i) => i * 1000 / 60)],
  ['144 Hz', Array.from({ length: 1460 }, (_, i) => i * 1000 / 144)],
  ['irregular and missed frames', [0, 77, 100, 107, 124, 550, 3000, 4999, 5005, 5750, 8999, 10099, 10100, 10400]],
  ['hidden-tab gap and return', [0, 100, 250, 4000, 12000, 15000]],
]) {
  test(`renderer preserves accepted trajectory, ticks and single completion: ${name}`, () => {
    const driver = mount();
    assert.equal(driver.queue.size, 1, 'one frame owner per wheel');
    let previous = plan.startRotation;
    for (const time of times) {
      const angle = driver.step(time);
      const expected = time < plan.startAt ? plan.startRotation : mechanics.spinRotationAtTime(plan, Math.min(plan.durationMs, time - plan.startAt));
      assert.equal(angle, expected, `exact angle at ${time}ms`);
      assert.ok(driver.queue.size <= 1);
      if (time >= plan.startAt && !driver.canvas.__wheelSpinV110.completed) {
        assert.equal(driver.targets.at(-1), engine.entryAtPointer(entries, previous)?.id);
      }
      previous = angle;
    }
    assert.equal(driver.completed, 1);
    assert.equal(driver.queue.size, 0);
    assert.equal(driver.canvas.__wheelSpinV110.finalFrameRotation, plan.finalRotation);
    assert.equal(engine.entryAtPointer(entries, plan.finalRotation).id, plan.winnerId);
    assert.equal(driver.ticks.reduce((a, b) => a + b, 0), engine.countSegmentBoundaryCrossings(engine.segmentBoundaryRotations(entries), plan.startRotation, plan.finalRotation));
    assert.ok(Math.abs(driver.canvas.__wheelSpinV110.actualFinalFrameDelta - driver.canvas.__wheelSpinV110.expectedFinalFrameDelta) < 1e-7);
    driver.stop();
  });
}

test('cancellation releases the frame; remount with accepted startAt resumes the existing clock', () => {
  const first = mount(); first.step(2000); first.stop();
  assert.equal(first.queue.size, 0); first.step(15000); assert.equal(first.completed, 0);
  const resumed = mount();
  assert.equal(resumed.step(6000), mechanics.spinRotationAtTime(plan, 5900));
  resumed.step(10100); assert.equal(resumed.completed, 1); resumed.stop();
});

test('reduced motion retains deferred exact settlement without boundary ticks', () => {
  const driver = mount(source, { reducedMotion: true });
  assert.equal(driver.completed, 0); driver.step(1);
  assert.equal(driver.completed, 1); assert.equal(driver.rotor.style.transform, `rotate(${plan.finalRotation}deg)`);
  assert.deepEqual(driver.ticks, []); assert.equal(driver.queue.size, 0); driver.stop();
});

test('entry snapshot replacement refreshes weighted pointer geometry including labels and visibility', () => {
  const edited = entries.map((entry, index) => ({ ...entry, label: `${entry.label} edited`, weight: index + 3, state: index === 0 ? 'hidden' : 'active' })).reverse();
  const driver = mount(source, { entries: edited });
  driver.step(100); driver.step(1800); driver.step(2200);
  assert.equal(driver.targets.at(-1), engine.entryAtPointer(edited, mechanics.spinRotationAtTime(plan, 1700)).id);
  driver.stop();
});

test('optional recorded pre-patch component delivers identical angles, boundaries and completion', { skip: !process.env.WHEEL_RENDER_BASELINE }, async () => {
  const baseline = await readFile(process.env.WHEEL_RENDER_BASELINE, 'utf8');
  const before = mount(baseline); const after = mount();
  for (const time of [0, 100, 107, 117, 999, 3333, 5000, 5777, 8000, 10099, 10100, 15000]) assert.equal(after.step(time), before.step(time));
  assert.deepEqual(after.ticks, before.ticks); assert.equal(after.completed, before.completed);
  assert.equal(after.canvas.__wheelSpinV110.settledAt, before.canvas.__wheelSpinV110.settledAt);
  before.stop(); after.stop();
});
