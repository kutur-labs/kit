import type { Locator, Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The danger token, light-dark(#b91c1c, #f87171), as Chromium computes it.
const danger = { light: "rgb(185, 28, 28)", dark: "rgb(248, 113, 113)" } as const;

// How far the thumb sits from the track's inline start, and whether the track holds it.
const thumbIn = async (page: Page, control: Locator) => {
  const [track, thumb] = await Promise.all([
    control.boundingBox(),
    control.locator("span").boundingBox(),
  ]);

  if (!track || !thumb) throw new Error("The switch rendered no track or thumb.");

  const isRtl = await page.evaluate(() => document.documentElement.dir === "rtl");

  return {
    offset: isRtl ? track.x + track.width - (thumb.x + thumb.width) : thumb.x - track.x,
    isInside: thumb.x >= track.x && thumb.x + thumb.width <= track.x + track.width,
  };
};

describe.each(schemes)("Switch in the %s scheme", (scheme) => {
  it.each([
    { demo: "core", name: "Notifications", dir: "ltr" },
    { demo: "themed", name: "Delete old drafts", dir: "ltr" },
    { demo: "core", name: "Notifications", dir: "rtl" },
    { demo: "themed", name: "Delete old drafts", dir: "rtl" },
  ])(
    "slides the $demo demo's thumb along the track once a click turns it on, in $dir",
    async ({ demo, name, dir }) => {
      const { page } = await open("/switch", scheme);
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
      }, dir);
      const control = page.locator(`#${demo}-demo`).getByRole("switch", { name });
      const off = await thumbIn(page, control);

      await control.click();
      await expect.poll(() => control.getAttribute("aria-checked")).toBe("true");
      const on = await thumbIn(page, control);

      expect(on.offset - off.offset).toBeCloseTo(20, 1);
      expect([off.isInside, on.isInside]).toEqual([true, true]);
    },
  );

  it("fills a switch with the accent token its part overrides", async () => {
    const { page } = await open("/switch", scheme);
    const control = page.getByRole("switch", { name: "Delete old drafts" });

    await control.click();
    await expect.poll(() => control.getAttribute("aria-checked")).toBe("true");
    expect(await computed(control, "background-color")).toBe(danger[scheme]);
  });
});
