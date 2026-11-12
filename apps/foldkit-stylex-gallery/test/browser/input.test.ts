import { describe, expect, it } from "vitest";

import { computed, edgeContrast, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Input in the $colorScheme scheme", (scheme) => {
  it("rests the read-only input on its fill alone, where an editable one has an edge", async () => {
    const { page } = await open("/input", scheme);

    expect(await computed(page.locator("#handle"), "border-top-color")).toBe("rgba(0, 0, 0, 0)");
    expect(await computed(page.locator("#email"), "border-top-color")).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("turns an editable field's edge to 3:1 under the pointer", async () => {
    const { page } = await open("/input", scheme);

    const field = page.locator("#email");
    await field.hover();

    // Polled past the edge's ease-in.
    await expect.poll(() => edgeContrast(field)).toBeGreaterThanOrEqual(3);
  });
});
