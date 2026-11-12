import type { Locator } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, rgba, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// How far the thumb's centre sits from the track's inline start, in CSS pixels. The theme draws
// the thumb as the track's ::after, which has no box to measure, so this reads the middle row of a
// screenshot. Each pixel inside the track's edge mixes the fill and the thumb's color, and the
// share of the thumb's color is how much of that pixel the thumb covers.
const thumbOffset = async (control: Locator) => {
  const [box, png, fill, thumb] = await Promise.all([
    control.boundingBox(),
    control.screenshot({ animations: "disabled" }),
    computed(control, "background-color").then((color) => rgba(control.page(), color)),
    computed(control, "background-color", "::after").then((color) => rgba(control.page(), color)),
  ]);

  if (!box) throw new Error("The switch rendered no track.");

  return control.evaluate(
    async (track, [png, x, fill, thumb]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");

      if (context === null) throw new Error("No 2D canvas to read the screenshot with.");
      context.drawImage(image, 0, 0);
      const row = context.getImageData(0, Math.floor(image.height / 2), image.width, 1).data;
      const style = getComputedStyle(track);
      const edge = Number.parseFloat(style.borderInlineStartWidth);
      const { width } = track.getBoundingClientRect();
      // The screenshot starts at the whole pixel at or before the track.
      const start = x - Math.floor(x);
      const channels = [0, 1, 2] as const;
      const span = channels.reduce<number>((sum, c) => sum + (thumb[c] - fill[c]) ** 2, 0);

      const pixels = Array.from({ length: image.width }, (_, index) => {
        const left = index - start;

        const cover = channels.reduce<number>(
          (sum, c) => sum + ((row[index * 4 + c] ?? 0) - fill[c]) * (thumb[c] - fill[c]),
          0,
        );

        return { centre: left + 0.5, cover: Math.min(Math.max(cover / span, 0), 1) };
      }).filter(({ centre }) => centre - 0.5 >= edge && centre + 0.5 <= width - edge);

      const covered = pixels.reduce((sum, { cover }) => sum + cover, 0);
      const centre = pixels.reduce((sum, pixel) => sum + pixel.centre * pixel.cover, 0) / covered;

      return style.direction === "rtl" ? width - centre : centre;
    },
    [png.toString("base64"), box.x, fill, thumb] as const,
  );
};

describe.each(schemes)("Switch in the $colorScheme scheme", (scheme) => {
  // The track's content box is two thumbs wide, so the thumb moves by one thumb: size.mark less 2px,
  // 14px.
  it.each(["ltr", "rtl"])(
    "slides the thumb along the track once a click turns it on, in %s",
    async (dir) => {
      const { page } = await open("/switch", scheme);
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
      }, dir);
      const control = page.locator("#demo").getByRole("switch", { name: "Delete old drafts" });
      const off = await thumbOffset(control);

      await control.click();
      await expect.poll(() => control.getAttribute("aria-checked")).toBe("true");

      // Inside the 1px edge and the 1px padding, so half a thumb further: 9px.
      expect(off).toBeCloseTo(9, 0);
      expect((await thumbOffset(control)) - off).toBeCloseTo(14, 0);
    },
  );
});
