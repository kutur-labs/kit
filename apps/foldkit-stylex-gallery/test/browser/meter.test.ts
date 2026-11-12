import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The theme's accent token, which defaults to the text color, light-dark(#18181b, #ededed), as
// Chromium computes it.
const accent = { light: "rgb(24, 24, 27)", dark: "rgb(237, 237, 237)" } as const;

// The theme's danger token, light-dark(#b91c1c, #f87171).
const danger = { light: "rgb(185, 28, 28)", dark: "rgb(248, 113, 113)" } as const;

describe.each(schemes)("Meter in the $colorScheme scheme", (scheme) => {
  it("turns the fill to the danger color past the threshold farthest from optimum", async () => {
    const { page } = await open("/meter", scheme);
    const storage = page.locator("#storage > div");
    const use = page.locator("#demo").getByRole("button", { name: "Use 2 GB" });

    // Storage is best empty: 4 GB is under `low`, 8 GB is at `high` and still short of the worst.
    expect(await computed(storage, "background-color")).toBe(accent[scheme.colorScheme]);
    await use.click();
    await use.click();
    await expect.poll(() => storage.getAttribute("data-value")).toBe("8");
    expect(await computed(storage, "background-color")).toBe(accent[scheme.colorScheme]);
    await use.click();
    await expect.poll(() => computed(storage, "background-color")).toBe(danger[scheme.colorScheme]);
    // A battery is best full, so 15% under `low` is its worst.
    expect(await computed(page.locator("#battery > div"), "background-color")).toBe(
      danger[scheme.colorScheme],
    );
  });
});
