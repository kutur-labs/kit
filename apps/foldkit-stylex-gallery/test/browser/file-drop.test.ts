import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { computed, isFocused, schemes, tabInto, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("FileDrop in the $colorScheme scheme", (scheme) => {
  it("hides the input in the middle of its zone and keeps it working", async () => {
    const { page } = await open("/file-drop", scheme);
    const input = page.locator("#attachments");
    const zone = input.locator("..");
    const [i, z] = await Promise.all([input.boundingBox(), zone.boundingBox()]);

    if (!i || !z) throw new Error("The demo rendered no input or zone.");

    // A 44px square around the input's centre stays in the zone, which activates the input.
    const centre = { x: i.x + i.width / 2, y: i.y + i.height / 2 };

    expect([i.width, i.height]).toEqual([1, 1]);
    expect(
      Math.min(centre.x - z.x, z.x + z.width - centre.x, centre.y - z.y, z.y + z.height - centre.y),
    ).toBeGreaterThanOrEqual(22);

    await input.setInputFiles({
      name: "zine.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF"),
    });
    await expect.poll(() => page.getByText("zine.pdf", { exact: true }).count()).toBe(1);
  });

  // A click focuses the input too, which ':focus-within' would ring.
  it("rings the zone while its input has keyboard focus, not after a click", async () => {
    const { page } = await open("/file-drop", scheme);
    const input = page.locator("#attachments");
    const zone = input.locator("..");

    await zone.click();
    expect(await isFocused(input)).toBe(true);
    expect(await computed(zone, "outline-style")).toBe("none");
    await tabInto(page);
    expect(await isFocused(input)).toBe(true);
    expect(await computed(zone, "outline-style")).toBe("solid");
  });

  it("draws the zone's dashed edge solid while a drag is over it", async () => {
    const { page } = await open("/file-drop", scheme);
    const zone = page.locator("#attachments").locator("..");
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    expect(await computed(zone, "border-top-style")).toBe("dashed");
    await zone.dispatchEvent("dragenter", { dataTransfer });
    await expect.poll(() => zone.getAttribute("data-drag-over")).toBe("");
    expect(await computed(zone, "border-top-style")).toBe("solid");
  });
});
