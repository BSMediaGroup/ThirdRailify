const DIRECTIONS = ["left", "right", "up", "down"];

export function computeStageLayout(input) {
  const count = boundedInteger(input?.count, 1, 6, "Stage wheel count");
  const width = positive(input?.width, "Stage width"); const height = positive(input?.height, "Stage height");
  const gap = Math.min(28, Math.max(10, Math.min(width, height) * .018));
  const rowCounts = layoutRows(count, width);
  const columns = Math.max(...rowCounts); const rows = rowCounts.length;
  const cellWidth = (width - gap * Math.max(0, columns - 1)) / columns;
  const cellHeight = (height - gap * Math.max(0, rows - 1)) / rows;
  const chrome = Math.min(88, Math.max(48, cellHeight * .2));
  const phoneDiameterCap = width < 520 ? width * .7 : Infinity;
  const diameter = Math.max(1, Math.min(cellWidth, cellHeight - chrome, phoneDiameterCap));
  const selected = { columns, rows, rowCounts, cellWidth, cellHeight, diameter }; const cells = []; let index = 0;
  selected.rowCounts.forEach((rowCount, row) => {
    const rowWidth = rowCount * selected.cellWidth + Math.max(0, rowCount - 1) * gap;
    const rowOffset = (width - rowWidth) / 2;
    for (let column = 0; column < rowCount; column += 1) {
      const x = rowOffset + column * (selected.cellWidth + gap); const y = row * (selected.cellHeight + gap);
      cells.push({ index, row, column, x: round(x), y: round(y), width: round(selected.cellWidth), height: round(selected.cellHeight), centerX: round(x + selected.cellWidth / 2), centerY: round(y + selected.cellHeight / 2), diameter: round(selected.diameter) }); index += 1;
    }
  });
  const neighbors = directionalNeighbors(cells);
  return { count, width: round(width), height: round(height), rows: selected.rows, columns: selected.columns, rowCounts: selected.rowCounts, gap: round(gap), wheelDiameter: round(selected.diameter), cells: cells.map((cell) => ({ ...cell, neighbors: neighbors[cell.index] })) };
}

export function directionalNeighbors(cells) {
  return cells.map((origin) => Object.fromEntries(DIRECTIONS.map((direction) => [direction, nearest(origin, cells, direction)])));
}

function nearest(origin, cells, direction) {
  const horizontal = direction === "left" || direction === "right"; const sign = direction === "left" || direction === "up" ? -1 : 1;
  const candidates = cells.filter((cell) => cell.index !== origin.index).map((cell) => {
    const primary = horizontal ? (cell.centerX - origin.centerX) * sign : (cell.centerY - origin.centerY) * sign;
    const cross = Math.abs(horizontal ? cell.centerY - origin.centerY : cell.centerX - origin.centerX);
    return { cell, primary, cross, score: primary + cross * 1.75 };
  }).filter((item) => item.primary > .5).sort((a, b) => a.score - b.score || a.cross - b.cross || a.primary - b.primary || a.cell.index - b.cell.index);
  return candidates[0]?.cell.index ?? null;
}

function layoutRows(count, width) {
  if (width < 520) return Array.from({ length: count }, () => 1);
  if (width < 900) return balancedRows(count, Math.min(2, count), Math.ceil(count / 2));
  return [[1], [2], [3], [2, 2], [3, 2], [3, 3]][count - 1];
}
function balancedRows(count, columns, rows) { const result = []; let remaining = count; for (let row = 0; row < rows; row += 1) { const rowsLeft = rows - row; const amount = Math.min(columns, Math.ceil(remaining / rowsLeft)); result.push(amount); remaining -= amount; } return result; }
function boundedInteger(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} must be ${min}–${max}.`); return number; }
function positive(value, label) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be positive.`); return number; }
function round(value) { return Math.round(value * 1000) / 1000; }
