import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("Wheels V1.4 uses the Public semantic button hierarchy", async () => {
  const [landing, pageEditor, modalEditor, winner, globalStyles] = await Promise.all([
    read("src/pages/WheelsPage.tsx"), read("src/pages/WheelEditorPage.tsx"), read("src/wheels/WheelEditorDialog.tsx"), read("src/wheels/WinnerCelebration.tsx"), read("src/styles/global.css"),
  ]);
  assert.match(landing, /className="button button--primary"[^>]*>[\s\S]*Build a wheel/);
  assert.match(landing, /className="button button--ghost button--text"[^>]*>[\s\S]*Explore public wheels/);
  for (const expected of ["Import wheel", "Exit editor", "Discard", "Create wheel"]) assert.match(pageEditor, new RegExp(expected));
  assert.match(pageEditor, /wheel-editor-actions/); assert.match(pageEditor, /button--primary/); assert.match(pageEditor, /button--secondary/); assert.match(pageEditor, /button--ghost/);
  assert.match(modalEditor, /Import \/ Export/); assert.match(modalEditor, /Customize appearance/); assert.match(modalEditor, /button button--primary/); assert.match(modalEditor, /button button--secondary/);
  for (const variant of ["button--secondary", "button--ghost", "button--danger-outline", "button--danger"]) assert.match(winner, new RegExp(variant));
  for (const variant of ["button--ghost", "button--danger", "button--danger-outline", "button--compact", "button--text"]) assert.match(globalStyles, new RegExp(`\\.${variant}`));
});

test("Wheels V1.4 celebration is bounded, tiered, finite, and reduced-motion safe", async () => {
  const [winner, styles] = await Promise.all([read("src/wheels/WinnerCelebration.tsx"), read("src/styles/wheels.css")]);
  assert.match(winner, /intensity === "strong" \? 148 : intensity === "normal" \? 96 : 44/);
  assert.match(winner, /reduced \? 0/); assert.match(winner, /window\.clearTimeout/); assert.doesNotMatch(winner, /requestAnimationFrame|setInterval/);
  assert.match(winner, /winner-lightshow__bloom/); assert.match(winner, /is-static/);
  assert.match(styles, /@keyframes confettiStageV14/); assert.match(styles, /@keyframes confettiCannonV14/); assert.match(styles, /@keyframes winnerBloomV14/); assert.match(styles, /@media\(prefers-reduced-motion:reduce\)[\s\S]*winner-lightshow\.is-static/);
});

test("Wheels V1.4 terminates the hero rail and centers the editor on the viewport", async () => {
  const styles = await read("src/styles/wheels.css");
  assert.match(styles, /\.wheels-trust-rail\{border-bottom:1px solid/);
  assert.match(styles, /\.wheel-editor-backdrop\{place-items:center;padding:24px/);
  assert.match(styles, /\.wheel-editor-dialog\{width:min\(1050px,calc\(100vw - 48px\)\);max-height:min\(900px,calc\(100dvh - 48px\)\);margin:auto\}/);
});
