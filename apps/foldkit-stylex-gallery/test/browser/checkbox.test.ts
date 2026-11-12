import { describe, expect, it } from "vitest";

import { computed, schemes, settled, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The tick's path has a length of 1, so a dash offset of 1 hides it and 0 draws all of it.
describe.each(schemes)("Checkbox in the $colorScheme scheme", (scheme) => {
  it("draws the tick once a click checks the box", async () => {
    const { page } = await open("/checkbox", scheme);
    const checkbox = page.locator("#demo").getByRole("checkbox");
    const tick = checkbox.locator("svg");

    expect(await computed(tick, "stroke-dashoffset")).toBe("1px");
    await checkbox.click();
    await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("true");
    // The tick draws itself in, so it is read once that ends.
    await settled(tick);
    expect(await computed(tick, "stroke-dashoffset")).toBe("0px");
  });
});
