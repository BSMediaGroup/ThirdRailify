import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wheelPage = await readFile(new URL("../src/pages/WheelPage.tsx", import.meta.url), "utf8");
const stagePage = await readFile(new URL("../src/pages/WheelStagePage.tsx", import.meta.url), "utf8");
const directory = await readFile(new URL("../src/pages/WheelsPage.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles/wheels-v111.css", import.meta.url), "utf8");

test("regular Wheel detail owns its wide composition instead of inheriting the shared container", () => {
  assert.match(wheelPage, /"wheel-control-layout wheel-detail-shell"/);
  assert.doesNotMatch(wheelPage, /"container wheel-control-layout"/);
  assert.match(styles, /--wheels-detail-max:\s*1720px/);
  assert.match(styles, /\.wheel-control-page:not\(\.wheel-control-page--presentation\) \.wheel-detail-shell\s*\{[^}]*width:\s*min\(calc\(100vw - clamp\(32px, 5vw, 104px\)\), var\(--wheels-detail-max\)\)/s);
  assert.match(wheelPage, /wheel-control-heading__meta/);
});

test("regular and Presentation owner identity rests as an avatar and expands for hover or keyboard focus", () => {
  assert.equal((wheelPage.match(/<WheelOwnerDetails wheel=\{wheel\} access=\{access\} disabled=\{!interactive\} \/>/g) || []).length, 2);
  assert.match(styles, /\.wheel-owner--identity \.wheel-owner__trigger\s*\{[^}]*max-width:\s*38px[^}]*cubic-bezier\(\.22, 1, \.36, 1\)/s);
  assert.match(styles, /\.wheel-owner--identity:hover \.wheel-owner__trigger,[\s\S]*\.wheel-owner--identity:focus-within \.wheel-owner__trigger,[\s\S]*max-width:\s*270px/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*\.wheel-owner--identity \.wheel-owner__trigger/);
});

test("Stage overview avatars and focused info controls intentionally differ", () => {
  assert.match(stagePage, /<WheelOwnerDetails wheel=\{wheel\} access=\{props\.item\.access\} variant="avatar"/);
  assert.match(stagePage, /<WheelOwnerDetails wheel=\{wheel\} access=\{props\.item\.access\} variant="info"/);
  assert.match(styles, /--wheels-focus-rail:\s*286px/);
  assert.match(styles, /\.stage-focus-spin\s*\{[^}]*min-height:\s*52px/s);
  assert.match(styles, /\.stage-focus-sound\s*\{[^}]*min-height:\s*38px/s);
});

test("Wheel and Stage listings share one fixed card and artwork footprint", () => {
  assert.match(directory, /className="wheel-card wheel-card--single"/);
  assert.match(directory, /className="wheel-card wheel-card--stage"/);
  assert.match(directory, /<p className="eyebrow">WHEEL<\/p>/);
  assert.match(directory, /<p className="eyebrow">STAGE<\/p>/);
  assert.match(styles, /\.wheel-card\s*\{[^}]*grid-template-rows:\s*184px minmax\(0, 1fr\)[^}]*height:\s*458px/s);
  assert.match(directory, /Array\.from\(\{ length: 3 \}/);
  assert.doesNotMatch(directory, /Math\.random/);
});
