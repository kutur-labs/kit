import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

// The violet the themed demo sets as the accent on its panel.
const violet = { light: "rgb(109, 40, 217)", dark: "rgb(196, 181, 253)" } as const;

describe.each(schemes)("DatePicker in the %s scheme", (scheme) => {
  it("raises the portaled panel over a backdrop that closes it on an outside click", async () => {
    const { page } = await open("/date-picker", scheme);
    const trigger = page.locator("#due-popover-button");

    const panel = await openPanel(trigger, page.locator("#foldkit-portal-root #due-popover-panel"));
    const backdrop = panel.locator("xpath=preceding-sibling::div[1]");

    expect(await computed(panel, "z-index")).toBe("10");
    // The wrapper, around the plain div @foldkit/ui puts the trigger in.
    expect(await computed(trigger.locator("../.."), "position")).toBe("relative");
    expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, width: 1280, height: 900 });
    await page.mouse.click(1276, 896);
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

  it("keeps the themed panel readable and its days reachable in the portal root", async () => {
    const { page } = await open("/date-picker", scheme);
    await openPanel(
      page.locator("#themed-due-popover-button"),
      page.locator("#foldkit-portal-root #themed-due-popover-panel"),
    );

    expect(await audit(page, "#foldkit-portal-root")).toEqual([]);
  });

  it("carries the accent set on the panel to the calendar inside it", async () => {
    const { page } = await open("/date-picker", scheme);

    const panel = await openPanel(
      page.locator("#themed-due-popover-button"),
      page.locator("#foldkit-portal-root #themed-due-popover-panel"),
    );

    expect(await computed(panel.locator("[data-today] button"), "border-top-color")).toBe(
      violet[scheme],
    );
  });
});
