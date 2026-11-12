import { describe, expect, it } from "vitest";

import { computed, schemes, settled, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Disclosure in the $colorScheme scheme", (scheme) => {
  it("turns the chevron once a click opens it", async () => {
    const { page } = await open("/disclosure", scheme);
    const button = page.locator("#demo").getByRole("button", { name: "When will my order ship?" });
    const chevron = button.locator("svg");

    expect(await computed(chevron, "rotate")).toBe("none");
    await button.click();
    await expect.poll(() => button.getAttribute("aria-expanded")).toBe("true");
    // The chevron turns, so it is read once that ends.
    await settled(chevron);
    expect(await computed(chevron, "rotate")).toBe("180deg");
  });
});
