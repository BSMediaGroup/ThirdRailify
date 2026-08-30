import assert from "node:assert/strict";
import test from "node:test";
import { computeStageLayout } from "../src/wheels/stageLayout.mjs";

const viewports = [[1920, 880], [2560, 880], [3440, 1240], [1365, 620], [768, 850], [390, 700]];

test("Stage layout deterministically fits one through six wheels without overlap", () => {
  for (const [width, height] of viewports) for (let count = 1; count <= 6; count += 1) {
    const first = computeStageLayout({ count, width, height }); const second = computeStageLayout({ count, width, height }); assert.deepEqual(first, second); assert.equal(first.cells.length, count); assert.ok(first.wheelDiameter > 0);
    for (const cell of first.cells) { assert.ok(cell.x >= 0 && cell.y >= 0); assert.ok(cell.x + cell.width <= width + .01); assert.ok(cell.y + cell.height <= height + .01); assert.equal(cell.diameter, first.wheelDiameter); for (const neighbor of Object.values(cell.neighbors)) assert.ok(neighbor === null || neighbor >= 0 && neighbor < count); }
    for (let a = 0; a < first.cells.length; a += 1) for (let b = a + 1; b < first.cells.length; b += 1) { const xOverlap = Math.min(first.cells[a].x + first.cells[a].width, first.cells[b].x + first.cells[b].width) - Math.max(first.cells[a].x, first.cells[b].x); const yOverlap = Math.min(first.cells[a].y + first.cells[a].height, first.cells[b].y + first.cells[b].height) - Math.max(first.cells[a].y, first.cells[b].y); assert.ok(xOverlap <= 0 || yOverlap <= 0); }
  }
});

test("desktop Stage uses the exact one-through-six editorial arrangements", () => {
  const expected = [[1], [2], [3], [2, 2], [3, 2], [3, 3]];
  for (let count = 1; count <= 6; count += 1) {
    const layout = computeStageLayout({ count, width: 1840, height: 850 });
    assert.deepEqual(layout.rowCounts, expected[count - 1]);
  }
  const three = computeStageLayout({ count: 3, width: 1840, height: 850 }); assert.equal(three.rows, 1); assert.equal(three.columns, 3); assert.ok(three.wheelDiameter >= 500);
  const six = computeStageLayout({ count: 6, width: 1840, height: 850 }); assert.equal(six.rows, 2); assert.equal(six.columns, 3); assert.deepEqual(six.rowCounts, [3, 3]); assert.ok(six.wheelDiameter >= 300);
  const b = six.cells[1].neighbors; assert.equal(b.left, 0); assert.equal(b.right, 2); assert.equal(b.down, 4); assert.equal(b.up, null);
  const e = six.cells[4].neighbors; assert.equal(e.left, 3); assert.equal(e.right, 5); assert.equal(e.up, 1); assert.equal(e.down, null);
});

test("ultrawide Stage preserves the 3x2 composition and phone wheels stay circular and compact", () => {
  const wide = computeStageLayout({ count: 6, width: 3300, height: 1180 }); assert.equal(wide.columns, 3); assert.deepEqual(wide.rowCounts, [3, 3]); assert.ok(wide.wheelDiameter >= 480);
  const phone = computeStageLayout({ count: 6, width: 358, height: 1968 }); assert.equal(phone.columns, 1); assert.equal(phone.rows, 6); assert.ok(phone.wheelDiameter <= 358 * .7 + .01); assert.ok(phone.wheelDiameter >= 240);
});
