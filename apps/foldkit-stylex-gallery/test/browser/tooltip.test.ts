import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// Focus from the keyboard opens a tooltip at once; the panel shows once Floating UI places it.
const showTooltip = async (page: Page, id: string) => {
  await page.locator(`#${id}-trigger`).focus();
  const panel = page.locator(`#foldkit-portal-root #${id}-panel`);
  await expect.poll(() => computed(panel, "visibility")).toBe("visible");

  return panel;
};

describe.each(schemes)("Tooltip in the $colorScheme scheme", (scheme) => {
  it("opens the panel above its trigger and over the page, letting the pointer through", async () => {
    const { page } = await open("/tooltip", scheme);
    const panel = await showTooltip(page, "save");

    const [p, t] = await Promise.all([
      panel.boundingBox(),
      page.locator("#save-trigger").boundingBox(),
    ]);

    if (!p || !t) throw new Error("The tooltip rendered no panel or trigger.");
    expect(p.y + p.height).toBeLessThanOrEqual(t.y);
    expect(await computed(panel, "z-index")).toBe("10");
    expect(await computed(panel, "pointer-events")).toBe("none");
  });
});
