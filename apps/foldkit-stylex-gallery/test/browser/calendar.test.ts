import type { Locator } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The cell the keyboard cursor is on; @foldkit/ui marks it only while the grid has focus.
const cursorIn = (grid: Locator) => grid.locator("[data-focused]");

// Where each cell of a grid sits, rounded to whole pixels, in document order.
const cellPositions = (grid: Locator) =>
  grid.locator('[role="gridcell"]').evaluateAll((cells) =>
    cells.map((cell) => {
      const { x, y } = cell.getBoundingClientRect();

      return { x: Math.round(x), y: Math.round(y) };
    }),
  );

// Where the cells would sit laid out row by row in `columns` columns, from the x of each cell in
// the first row and the y of each row's first cell.
const gridOf = (positions: ReadonlyArray<Readonly<{ x: number; y: number }>>, columns: number) => {
  const xs = positions.slice(0, columns).map(({ x }) => x);
  const ys = positions.flatMap(({ y }, index) => (index % columns === 0 ? [y] : []));

  return { xs, ys, positions: ys.flatMap((y) => xs.map((x) => ({ x, y }))) };
};

describe.each(schemes)("Calendar in the %s scheme", (scheme) => {
  // @foldkit/ui's up and down keys move the cursor by 7 days, or by 3 months or years, so the
  // look must lay the cells out in as many columns for the cursor to move straight up or down.
  it("lays the themed days out in seven columns of six weeks", async () => {
    const { page } = await open("/calendar", scheme);
    const positions = await cellPositions(page.locator("#themed-deadline-grid"));
    const expected = gridOf(positions, 7);

    expect(new Set(expected.xs).size).toBe(7);
    expect(new Set(expected.ys).size).toBe(6);
    expect(positions).toEqual(expected.positions);
  });

  it("lays the themed months out in three columns of four", async () => {
    const { page } = await open("/calendar", scheme);
    const grid = page.locator("#themed-deadline-grid");
    await page
      .locator("#themed-deadline")
      .getByRole("button", { name: "Switch to month picker" })
      .click();
    await expect.poll(() => grid.getAttribute("aria-label")).toBe("Month picker, 2026");
    const positions = await cellPositions(grid);
    const expected = gridOf(positions, 3);

    expect(new Set(expected.xs).size).toBe(3);
    expect(new Set(expected.ys).size).toBe(4);
    expect(positions).toEqual(expected.positions);
  });

  it("rings the themed cursor cell while the grid has focus, as the grid draws none", async () => {
    const { page } = await open("/calendar", scheme);
    const grid = page.locator("#themed-deadline-grid");

    expect(await cursorIn(grid).count()).toBe(0);
    await grid.focus();
    await expect.poll(() => cursorIn(grid).count()).toBe(1);

    expect(await computed(cursorIn(grid).locator("button"), "outline-style")).toBe("solid");
    expect(await computed(grid, "outline-style")).toBe("none");
  });

  it("selects the day a click picks in the styled grid", async () => {
    const { page } = await open("/calendar", scheme);
    await page.locator("#themed-deadline-cell-2026-11-20 button").click();

    await expect
      .poll(() => page.locator("#themed-demo p").textContent())
      .toBe("Selected November 20, 2026.");
  });
});
