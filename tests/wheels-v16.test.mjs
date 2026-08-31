import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { wheelGalleryNeighbours, wheelNavigationDirection } from "../src/wheels/navigation.mjs";

const publicItems = [
  { slug: "alpha", title: "Alpha" },
  { slug: "charlie", title: "Charlie" },
  { slug: "bravo", title: "Bravo" },
];

test("Wheels V1.6 preserves authoritative gallery order without wraparound", () => {
  assert.deepEqual(wheelGalleryNeighbours(publicItems, "alpha"), { previous: null, currentPosition: 1, next: publicItems[1], total: 3 });
  assert.deepEqual(wheelGalleryNeighbours(publicItems, "charlie"), { previous: publicItems[0], currentPosition: 2, next: publicItems[2], total: 3 });
  assert.deepEqual(wheelGalleryNeighbours(publicItems, "bravo"), { previous: publicItems[1], currentPosition: 3, next: null, total: 3 });
  assert.equal(wheelNavigationDirection(publicItems, "alpha", "bravo"), "next");
  assert.equal(wheelNavigationDirection(publicItems, "bravo", "charlie"), "previous");
});

test("Wheels V1.6 never guesses neighbours for unlisted hidden or archived wheels", () => {
  assert.deepEqual(wheelGalleryNeighbours(publicItems, "hidden-wheel"), { previous: null, currentPosition: null, next: null, total: 3 });
  assert.deepEqual(wheelGalleryNeighbours(publicItems, "archived-wheel"), { previous: null, currentPosition: null, next: null, total: 3 });
  assert.equal(wheelNavigationDirection(publicItems, "hidden-wheel", "alpha"), null);
});

test("Wheels V1.6 handles authoritative empty and single-wheel galleries", () => {
  assert.deepEqual(wheelGalleryNeighbours([], "alpha"), { previous: null, currentPosition: null, next: null, total: 0 });
  assert.deepEqual(wheelGalleryNeighbours([publicItems[0]], "alpha"), { previous: null, currentPosition: 1, next: null, total: 1 });
});

test("Wheel accent reuses the validated pointerAccent contract across palette, rim, pointer, and page", async () => {
  const [appearance, canvas, page, styles] = await Promise.all([
    readFile(new URL("../src/wheels/AppearanceDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/WheelPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels.css", import.meta.url), "utf8"),
  ]);
  assert.match(appearance, /Wheel accent colour picker/);
  assert.match(appearance, /pointerAccent: option\.pointerAccent/);
  assert.match(canvas, /strokeStyle = config\.pointerAccent/);
  assert.match(page, /"--wheel-accent": wheel\.config\.pointerAccent/);
  assert.match(canvas, /drawMechanicalOverlay\(mechanicsElement, geometry, config\.pointerAccent\)/);
  assert.match(canvas, /context\.strokeStyle = accent/);
  assert.match(styles, /\.wheel-stage__mechanics\{[^}]*pointer-events:none/);
});

test("Wheels V1.6 refinement exposes expanded palettes, reset, presentation navigation, and reliable sharing", async () => {
  const [appearance, page, styles] = await Promise.all([
    readFile(new URL("../src/wheels/AppearanceDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/WheelPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels.css", import.meta.url), "utf8"),
  ]);
  const library = appearance.slice(appearance.indexOf("const WHEEL_PALETTES"), appearance.indexOf("];", appearance.indexOf("const WHEEL_PALETTES")) + 2);
  assert.equal([...library.matchAll(/\{\s+key:/g)].length, 30);
  for (const label of ["Electric Blue / White", "Midnight Blue / White", "Cobalt / Black", "Ice Blue / Navy / White", "Royal Blue Gradient", "Purple / White", "Pink / Black", "Gold / Purple", "Green / Black", "Sky / White / Navy"]) assert.ok(library.includes(label), `${label} is available`);
  assert.match(appearance, /DEFAULT_APPEARANCE_CONFIG/);
  assert.match(appearance, /Reset to default/);
  assert.match(appearance, /colour: null/);
  assert.match(page, /navigator\.share/);
  assert.match(page, /Wheel link copied to your clipboard/);
  assert.match(page, /Share options were unavailable, so the wheel link was copied instead/);
  assert.match(page, /summary\.slug\}\$\{presentation \? "\/present" : ""\}/);
  assert.match(page, /<WheelNavigator neighbours=\{props\.neighbours\} locked=\{locked\} onNavigate=\{props\.onNavigate\} \/><\/>/);
  assert.match(styles, /\.wheel-control-heading h1\{font-size:clamp\(42px,4\.8vw,69px\)/);
  assert.match(styles, /\.wheel-navigator__direction\{min-height:56px;padding:7px 12px/);
  assert.match(styles, /\.wheel-control-page--presentation \.wheel-spin-console\{grid-template-columns:[^}]*minmax\(330px,1fr\)/);
});

test("the live wheel centre shares the existing spin authority and lock", async () => {
  const [canvas, page, styles] = await Promise.all([
    readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/WheelPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /onCentreSpin\?: \(\) => void/);
  assert.match(canvas, /className={`wheel-stage__hub is-spin-control/);
  assert.match(canvas, /disabled=\{centreSpinDisabled\}/);
  assert.match(page, /onCentreSpin=\{interactive \? \(\) => void props\.onSpin\(\) : undefined\}/);
  assert.match(page, /centreSpinDisabled=\{spinDisabled\}/);
  assert.match(styles, /\.wheel-stage__hub\.is-spin-control:focus-visible/);
});
