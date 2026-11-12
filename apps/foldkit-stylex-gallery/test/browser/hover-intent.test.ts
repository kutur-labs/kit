import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The demo keeps its panel rendered while closed, so the theme's hidden state is all that
// stops it from showing or catching the pointer.
describe.each(schemes)("HoverIntent in the $colorScheme scheme", (scheme) => {
  it("hides the closed panel from sight and from the pointer", async () => {
    const { page } = await open("/hover-intent", scheme);
    const panel = page.locator("#related-panel");

    const isHitAtCentre = await panel.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();

      return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    });

    expect(await computed(panel, "visibility")).toBe("hidden");
    expect(await computed(panel, "opacity")).toBe("0");
    expect(isHitAtCentre).toBe(false);
  });

  it("shows the panel below its trigger once focus opens it", async () => {
    const { page } = await open("/hover-intent", scheme);
    const trigger = page.locator("#related-trigger");
    const panel = page.locator("#related-panel");
    await trigger.focus();
    await expect.poll(() => computed(panel, "visibility")).toBe("visible");

    const [p, t] = await Promise.all([panel.boundingBox(), trigger.boundingBox()]);

    if (!p || !t) throw new Error("The demo rendered no panel or trigger.");
    expect(p.y).toBeGreaterThanOrEqual(t.y + t.height);
    // It fades in, under reduced motion too.
    await expect.poll(() => computed(panel, "opacity")).toBe("1");
  });
});
