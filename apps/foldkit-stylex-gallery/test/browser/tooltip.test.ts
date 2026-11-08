import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

// Focus from the keyboard opens a tooltip at once; the panel shows once Floating UI places it.
const showTooltip = async (page: Page, id: string) => {
  await page.locator(`#${id}-trigger`).focus();
  const panel = page.locator(`#foldkit-portal-root #${id}-panel`);
  await expect.poll(() => computed(panel, "visibility")).toBe("visible");

  return panel;
};

describe.each(schemes)("Tooltip in the %s scheme", (scheme) => {
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

  it.each(["themed-plain", "themed-inverted"])(
    "keeps the #%s panel readable in the portal root",
    async (id) => {
      const { page } = await open("/tooltip", scheme);
      await showTooltip(page, id);

      expect(await audit(page, "#foldkit-portal-root")).toEqual([]);
    },
  );

  // The demo sets the surface token on the panel part alone; the panel renders outside the demo.
  it("reaches the portaled panel with a token set on its part", async () => {
    const { page } = await open("/tooltip", scheme);
    const plain = await computed(await showTooltip(page, "themed-plain"), "background-color");
    const inverted = await showTooltip(page, "themed-inverted");

    expect(await computed(inverted, "background-color")).not.toBe(plain);
  });
});
