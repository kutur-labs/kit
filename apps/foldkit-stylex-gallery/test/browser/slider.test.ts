import { describe, expect, it } from "vitest";

import { schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Slider in the $colorScheme scheme", (scheme) => {
  it("keeps the thumb on the track's centre line and follows a drag", async () => {
    const { page } = await open("/slider", scheme);
    const thumb = page.locator("#volume-thumb");
    const track = thumb.locator("..");
    const [t, k] = await Promise.all([thumb.boundingBox(), track.boundingBox()]);

    if (!t || !k) throw new Error("#volume rendered no thumb or track.");

    expect(t.y + t.height / 2).toBeCloseTo(k.y + k.height / 2, 0);
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await page.mouse.down();
    await page.mouse.move(k.x + k.width, t.y + t.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect.poll(() => thumb.getAttribute("aria-valuenow")).toBe("100");
  });
});
