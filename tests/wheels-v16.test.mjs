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
  assert.match(styles, /\.wheel-stage__rim--outer\{[^}]*var\(--pointer\)/);
});
