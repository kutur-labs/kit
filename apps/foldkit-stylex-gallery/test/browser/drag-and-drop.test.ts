import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

const item = (page: Page, id: string) => page.locator(`[data-draggable-id="${id}"]`);

const list = (page: Page, id: string) => page.locator(`[data-droppable-id="${id}"]`);

const labels = (page: Page, id: string) => list(page, id).getByRole("option").allTextContents();

describe.each(schemes)("DragAndDrop in the $colorScheme scheme", (scheme) => {
  it("moves an item by keyboard, marking it and its list while it moves", async () => {
    const { page } = await open("/drag-and-drop", scheme);
    const brief = item(page, "brief");
    const idle = await computed(brief, "box-shadow");

    await brief.focus();
    await page.keyboard.press(" ");
    await expect.poll(() => computed(brief, "box-shadow")).not.toBe(idle);
    expect(await computed(list(page, "to-do"), "border-top-color")).not.toBe("rgba(0, 0, 0, 0)");

    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => labels(page, "to-do"))
      .toEqual(["Draw the cover", "Write the brief", "Print the pages"]);
    await expect
      .poll(() => brief.evaluate((element) => element === document.activeElement))
      .toBe(true);

    await page.keyboard.press(" ");
    await expect.poll(() => computed(brief, "box-shadow")).toBe(idle);
    expect(await labels(page, "to-do")).toEqual([
      "Draw the cover",
      "Write the brief",
      "Print the pages",
    ]);
  });

  it("drags an item by pointer into another list under a ghost and a placeholder", async () => {
    const { page } = await open("/drag-and-drop", scheme);

    const [start, target] = await Promise.all([
      item(page, "brief").boundingBox(),
      list(page, "done").boundingBox(),
    ]);

    if (!start || !target) throw new Error("The brief or the done list did not render.");
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height - 8, { steps: 8 });

    // The demo leaves the item out of its list while the pointer drags it, so only the ghost shows
    // its text.
    const ghost = page.getByText("Write the brief", { exact: true });

    // Each pointer move renders in its own animation frame, so the ghost appears within milliseconds
    // on an idle machine but can take over expect.poll's default second when CI runs the browser
    // suites at once.
    await expect.poll(() => ghost.count(), { timeout: 5_000 }).toBe(1);
    expect(await computed(ghost, "position")).toBe("fixed");
    expect(await computed(ghost, "pointer-events")).toBe("none");
    expect(await list(page, "done").locator(":scope > :not([role])").count()).toBe(1);

    await page.mouse.up();
    await expect.poll(() => labels(page, "done")).toEqual(["Buy paper", "Write the brief"]);
  });
});
