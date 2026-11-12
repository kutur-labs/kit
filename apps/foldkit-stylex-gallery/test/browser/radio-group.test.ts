import type { Locator } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The theme draws the selection as a ring in the accent with a dot that fades in.
const markOf = (radio: Locator) => {
  const ring = radio.locator("svg");

  return Promise.all([computed(ring, "color"), computed(ring.locator("circle").nth(1), "opacity")]);
};

describe.each(schemes)("RadioGroup in the $colorScheme scheme", (scheme) => {
  it("selects an option from a click on its description and moves the mark", async () => {
    const { page } = await open("/radio-group", scheme);
    const radios = page.locator("#demo").getByRole("radio");
    const [free, pro] = [radios.nth(0), radios.nth(1)];
    const [selected, unselected] = await Promise.all([markOf(free), markOf(pro)]);

    expect(selected).not.toEqual(unselected);
    await pro.getByText("Unlimited projects and drafts.").click();
    await expect.poll(() => pro.getAttribute("aria-checked")).toBe("true");
    // The dots fade, under reduced motion too.
    await expect
      .poll(() => Promise.all([markOf(free), markOf(pro)]))
      .toEqual([unselected, selected]);
  });
});
