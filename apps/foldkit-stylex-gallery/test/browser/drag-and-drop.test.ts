import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

const item = (page: Page, id: string) => page.locator(`[data-draggable-id="${id}"]`);

const list = (page: Page, id: string) => page.locator(`[data-droppable-id="${id}"]`);

const labels = (page: Page, id: string) => list(page, id).getByRole("option").allTextContents();

describe.each(schemes)("DragAndDrop in the %s scheme", (scheme) => {
  it("moves a themed item by keyboard, marking it and its list while it moves", async () => {
    const { page } = await open("/drag-and-drop", scheme);
    const brief = item(page, "themed-brief");
    const idle = await computed(brief, "background-color");

    await brief.focus();
    await page.keyboard.press(" ");
    await expect.poll(() => computed(brief, "background-color")).not.toBe(idle);
    expect(await computed(list(page, "themed-to-do"), "border-top-color")).not.toBe(
      "rgba(0, 0, 0, 0)",
    );

    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => labels(page, "themed-to-do"))
      .toEqual(["Draw the cover", "Write the brief", "Print the pages"]);
    await expect
      .poll(() => brief.evaluate((element) => element === document.activeElement))
      .toBe(true);

    await page.keyboard.press(" ");
    await expect.poll(() => computed(brief, "background-color")).toBe(idle);
    expect(await labels(page, "themed-to-do")).toEqual([
      "Draw the cover",
      "Write the brief",
      "Print the pages",
    ]);
  });

  it.each([
    { from: "brief", to: "done" },
    { from: "themed-brief", to: "themed-done" },
  ])("drags $from by pointer into $to under a ghost and a placeholder", async ({ from, to }) => {
    const { page } = await open("/drag-and-drop", scheme);

    const [start, target] = await Promise.all([
      item(page, from).boundingBox(),
      list(page, to).boundingBox(),
    ]);

    if (!start || !target) throw new Error(`#${from} or #${to} did not render.`);
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height - 8, { steps: 8 });

    // The other demo has an item with the same text; the ghost is the one without a role.
    const ghost = page
      .getByText("Write the brief", { exact: true })
      .and(page.locator(":not([role])"));

    await expect.poll(() => ghost.count()).toBe(1);
    expect(await computed(ghost, "position")).toBe("fixed");
    expect(await computed(ghost, "pointer-events")).toBe("none");
    expect(await list(page, to).locator(":scope > :not([role])").count()).toBe(1);

    await page.mouse.up();
    await expect.poll(() => labels(page, to)).toEqual(["Buy paper", "Write the brief"]);
  });
});
