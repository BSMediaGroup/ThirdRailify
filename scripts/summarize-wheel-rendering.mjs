import { readFile, readdir, writeFile } from 'node:fs/promises';
const root = '.artifacts/wheel-render-performance';
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = q => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : null;
  return { count: sorted.length, median: at(.5), p95: at(.95), p99: at(.99), max: at(1), total: sorted.reduce((a, b) => a + b, 0) };
};
const summaries = [];
for (const dir of await readdir(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of await readdir(`${root}/${dir.name}`)) {
    if (!/-\d+\.json$/.test(file)) continue;
    const run = JSON.parse(await readFile(`${root}/${dir.name}/${file}`, 'utf8'));
    if (!run.evidence?.probe) continue;
    const spin = run.evidence.spins[0].spin;
    const { frames, callbacks, reads, commits } = run.evidence.probe;
    const refresh = stats(frames.map(f => f[1])).median;
    const portions = {};
    for (const [name, from, to] of [['startup', 0, .2], ['middle', .2, .8], ['final', .8, 1], ['reported-window', .6, .85], ['seconds-36-50', 36000 / spin.durationMs, 50000 / spin.durationMs], ['whole', 0, 1]]) {
      const lo = from * spin.durationMs; const hi = to * spin.durationMs;
      const subset = frames.filter(([at]) => at >= lo && at < hi);
      const work = new Map();
      for (const [at, duration] of callbacks) if (at - spin.startAt >= lo && at - spin.startAt < hi) work.set(at, (work.get(at) || 0) + duration);
      portions[name] = {
        callbackIntervals: stats(subset.map(f => f[1])),
        gapsOver1_5Refresh: subset.filter(f => f[1] > refresh * 1.5).length,
        gapsOver2_5Refresh: subset.filter(f => f[1] > refresh * 2.5).length,
        rendererAndOtherRafWork: stats([...work.values()]),
        rotorReads: stats(reads.filter(([at]) => at - spin.startAt >= lo && at - spin.startAt < hi).map(f => f[1])),
        reactCommits: commits.filter(at => at - spin.startAt >= lo && at - spin.startAt < hi).length,
      };
    }
    const metrics = Object.fromEntries(run.after.metrics.map(m => [m.name, m.value - (run.before.metrics.find(b => b.name === m.name)?.value || 0)]));
    const summary = { run: `${dir.name}/${file}`, environment: run.environment, refresh, portions, metrics,
      spins: run.evidence.spins.map(({ spin: s, renderer: r }) => ({ duration: s.durationMs, settledElapsed: s.settledAt - s.startAt, finalAngleError: s.finalFrameRotation - s.finalRotation, finalDeltaError: s.actualFinalFrameDelta - s.expectedFinalFrameDelta, completed: s.completed, planBuilds: r.planBuilds, staticFaceRebuilds: r.staticFaceRebuilds, canvasResizes: r.canvasResizes, resizeInvalidations: r.resizeInvalidations, composites: r.faceComposites })), heap: run.evidence.heap, errors: run.errors,
    };
    summaries.push(summary);
    console.log(summary.run, 'whole', portions.whole.callbackIntervals, '60-85%', portions['reported-window'].callbackIntervals, 'work p95', portions.whole.rendererAndOtherRafWork.p95);
  }
}
await writeFile(`${root}/summary.json`, JSON.stringify(summaries, null, 2));

for (const directory of process.argv.slice(2)) {
  const files = await readdir(`${root}/${directory}`);
  for (const file of files.filter(f => f.endsWith('-trace.json'))) {
    const name = file.replace('-trace.json', '');
    const run = JSON.parse(await readFile(`${root}/${directory}/${name}-0.json`, 'utf8'));
    const events = JSON.parse(await readFile(`${root}/${directory}/${file}`, 'utf8')).traceEvents;
    const navigationStart = run.before.metrics.find(m => m.name === 'NavigationStart').value;
    const start = navigationStart * 1e6 + run.evidence.spins[0].spin.startAt * 1000;
    const names = ['FireAnimationFrame', 'FunctionCall', 'UpdateLayoutTree', 'Layout', 'Paint', 'RasterTask', 'RendererRasterWorker', 'MajorGC', 'MinorGC', 'DroppedFrame', 'FramePresented', 'DrawFrame'];
    const trace = {};
    for (const name of names) {
      const selected = events.filter(e => e.name === name);
      trace[name] = { durationsMs: stats(selected.filter(e => e.dur != null).map(e => e.dur / 1000)), count: selected.length,
        longest: selected.filter(e => e.dur != null).sort((a, b) => b.dur - a.dur).slice(0, 8).map(e => ({ elapsedMs: (e.ts - start) / 1000, durationMs: e.dur / 1000, pid: e.pid, tid: e.tid })),
      };
      if (name === 'DroppedFrame') trace[name].partial = selected.filter(e => e.args?.hasPartialUpdate).length;
    }
    trace.droppedTimeline = events.filter(e => e.name === 'DroppedFrame').map(e => ({ elapsedMs: (e.ts - start) / 1000, ...e.args }));
    await writeFile(`${root}/${directory}/${name}-trace-summary.json`, JSON.stringify(trace, null, 2));
    console.log(directory, name, Object.fromEntries(names.map(n => [n, { count: trace[n].count, totalMs: trace[n].durationsMs.total, maxMs: trace[n].durationsMs.max }])));
  }
}
