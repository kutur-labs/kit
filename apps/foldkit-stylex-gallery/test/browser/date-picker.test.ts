import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("DatePicker in the $colorScheme scheme", (scheme) => {
  it("raises the portaled panel over a backdrop that closes it on an outside click", async () => {
    const { page } = await open("/date-picker", scheme);
    const trigger = page.locator("#due-popover-button");

    const panel = await openPanel(trigger, page.locator("#foldkit-portal-root #due-popover-panel"));
    const backdrop = panel.locator("xpath=preceding-sibling::div[1]");

    expect(await computed(panel, "z-index")).toBe("10");
    // The wrapper, around the plain div @foldkit/ui puts the trigger in.
    expect(await computed(trigger.locator("../.."), "position")).toBe("relative");
    expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, ...scheme.viewport });
    await page.mouse.click(scheme.viewport.width - 4, scheme.viewport.height - 4);
    await expect.poll(() => panel.count()).toBe(0);
  });

  it("hands focus to the styled calendar and takes a day from the keyboard", async () => {
    const { page } = await open("/date-picker", scheme);
    const trigger = page.locator("#due-popover-button");
    const panel = await openPanel(trigger, page.locator("#foldkit-portal-root #due-popover-panel"));

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id))
      .toBe("due-calendar-grid");
    await page.keyboard.press("ArrowRight");
    // Enter commits the day the last render marked, so wait for the cursor to move first.
    await panel.locator("#due-calendar-cell-2026-11-9[data-focused]").waitFor();
    await page.keyboard.press("Enter");

    await expect.poll(() => panel.count()).toBe(0);
    expect(await trigger.textContent()).toBe("November 9, 2026");
  });

  // WCAG 2.5.3: the trigger's name starts with the visible label, which stays once a date shows.
  it("names the trigger by its visible label, then the date it shows", async () => {
    const { page } = await open("/date-picker", scheme);

    const panel = await openPanel(
      page.locator("#due-popover-button"),
      page.locator("#foldkit-portal-root #due-popover-panel"),
    );

    await panel.locator("#due-calendar-cell-2026-11-9").click();

    await expect
      .poll(() =>
        page.getByRole("button", { name: "Due date November 9, 2026", exact: true }).count(),
      )
      .toBe(1);
    expect(await page.locator("#demo").getByText("Due date", { exact: true }).isVisible()).toBe(
      true,
    );
  });
});
