import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

// Where an arrow drawn pointing up must point once the package turns it: at the trigger.
const turns = { top: "180deg", right: "-90deg", bottom: "none", left: "90deg" } as const;

describe.each(schemes)("Popover in the %s scheme", (scheme) => {
  it.each(Object.entries(turns))(
    "centres the %s panel's arrow on the edge that faces the trigger and turns it",
    async (side, rotate) => {
      const { page } = await open("/popover", scheme);
      const trigger = page.locator(`#${side}-button`);
      const panel = await openPanel(trigger, page.locator(`#${side}-panel`));
      const arrow = panel.locator(":scope > div").first();

      const [p, a, t] = await Promise.all([panel, arrow, trigger].map((it) => it.boundingBox()));

      if (!p || !a || !t)
        throw new Error(`The ${side} popover rendered no panel, arrow or trigger.`);
      const centre = { x: a.x + a.width / 2, y: a.y + a.height / 2 };

      const facing = {
        top: { x: t.x + t.width / 2, y: p.y + p.height },
        bottom: { x: t.x + t.width / 2, y: p.y },
        left: { x: p.x + p.width, y: t.y + t.height / 2 },
        right: { x: p.x, y: t.y + t.height / 2 },
      }[side];

      expect(await panel.getAttribute("data-placement")).toBe(side);
      expect(centre.x).toBeCloseTo(facing?.x ?? Number.NaN, 0);
      expect(centre.y).toBeCloseTo(facing?.y ?? Number.NaN, 0);
      expect(await computed(arrow, "rotate")).toBe(rotate);
    },
  );

  it("covers the viewport with the backdrop, so a click outside closes the panel", async () => {
    const { page } = await open("/popover", scheme);
    const panel = await openPanel(page.locator("#top-button"), page.locator("#top-panel"));
    const backdrop = panel.locator("xpath=preceding-sibling::div[1]");

    expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, width: 1280, height: 900 });
    await page.mouse.click(4, 896);
    await expect.poll(() => panel.count()).toBe(0);
  });

  it("paints the panel above its backdrop and the open trigger above the backdrop", async () => {
    const { page } = await open("/popover", scheme);
    const trigger = page.locator("#top-button");
    await openPanel(trigger, page.locator("#top-panel"));

    const hitAt = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();

        return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
      });

    expect(await computed(page.locator("#top-panel"), "z-index")).toBe("10");
    expect(await hitAt("#top-panel")).toBe(true);
    expect(await hitAt("#top-button")).toBe(true);
    expect(await computed(trigger.locator(".."), "position")).toBe("relative");
  });

  it("keeps the themed panel readable and its controls reachable in the portal root", async () => {
    const { page } = await open("/popover", scheme);
    await openPanel(
      page.locator("#themed-plain-button"),
      page.locator("#foldkit-portal-root #themed-plain-panel"),
    );

    expect(await audit(page, "#foldkit-portal-root")).toEqual([]);
  });
});
