import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// Where an arrow drawn pointing up must point once the package turns it: at the trigger.
const turns = { top: "180deg", bottom: "none" } as const;

// The demo opens below its trigger. With no room below, Floating UI flips the panel above it.
const makeRoomAbove = async (page: Page, width: number) => {
  const trigger = await page.locator("#plain-button").boundingBox();

  if (!trigger) throw new Error("The popover rendered no trigger.");
  await page.setViewportSize({ width, height: Math.ceil(trigger.y + trigger.height + 8) });
};

describe.each(schemes)("Popover in the $colorScheme scheme", (scheme) => {
  it.each(Object.entries(turns))(
    "centres the %s panel's arrow on the edge that faces the trigger and turns it",
    async (side, rotate) => {
      const { page } = await open("/popover", scheme);

      if (side === "top") await makeRoomAbove(page, scheme.viewport.width);
      const trigger = page.locator("#plain-button");
      const panel = await openPanel(trigger, page.locator("#plain-panel"));
      const arrow = panel.locator(":scope > div").first();

      const [p, a, t] = await Promise.all([panel, arrow, trigger].map((it) => it.boundingBox()));

      if (!p || !a || !t) throw new Error("The popover rendered no panel, arrow or trigger.");
      const centre = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
      // The arrow is positioned in the panel's padding box, so it centres on the inner side of the
      // panel's edge and covers the edge where they meet.
      const edge = Number.parseFloat(await computed(panel, "border-top-width"));

      const facing = {
        top: { y: p.y + p.height - edge },
        bottom: { y: p.y + edge },
      }[side];

      expect(await panel.getAttribute("data-placement")).toBe(side);
      expect(centre.x).toBeCloseTo(t.x + t.width / 2, 0);
      expect(centre.y).toBeCloseTo(facing?.y ?? Number.NaN, 0);
      expect(await computed(arrow, "rotate")).toBe(rotate);
    },
  );

  it("covers the viewport with the backdrop, so a click outside closes the panel", async () => {
    const { page } = await open("/popover", scheme);
    const panel = await openPanel(page.locator("#plain-button"), page.locator("#plain-panel"));
    const backdrop = panel.locator("xpath=preceding-sibling::div[1]");

    expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, ...scheme.viewport });
    await page.mouse.click(4, scheme.viewport.height - 4);
    await expect.poll(() => panel.count()).toBe(0);
  });

  it("paints the panel above its backdrop and the open trigger above the backdrop", async () => {
    const { page } = await open("/popover", scheme);
    const trigger = page.locator("#plain-button");
    await openPanel(trigger, page.locator("#plain-panel"));

    const hitAt = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();

        return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
      });

    expect(await computed(page.locator("#plain-panel"), "z-index")).toBe("10");
    expect(await hitAt("#plain-panel")).toBe(true);
    expect(await hitAt("#plain-button")).toBe(true);
    expect(await computed(trigger.locator(".."), "position")).toBe("relative");
  });
});
