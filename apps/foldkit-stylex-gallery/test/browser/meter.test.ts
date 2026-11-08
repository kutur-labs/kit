import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The theme's accent token, light-dark(#2563eb, #60a5fa), as Chromium computes it.
const accent = { light: "rgb(37, 99, 235)", dark: "rgb(96, 165, 250)" } as const;

// The theme's danger token, light-dark(#dc2626, #f87171).
const danger = { light: "rgb(220, 38, 38)", dark: "rgb(248, 113, 113)" } as const;

describe.each(schemes)("Meter in the %s scheme", (scheme) => {
  it("turns the themed fill to the danger color past the threshold farthest from optimum", async () => {
    const { page } = await open("/meter", scheme);
    const storage = page.locator("#themed-storage > div");
    const use = page.locator("#themed-demo").getByRole("button", { name: "Use 2 GB" });

    // Storage is best empty: 4 GB is under `low`, 8 GB is at `high` and still short of the worst.
    expect(await computed(storage, "background-color")).toBe(accent[scheme]);
    await use.click();
    await use.click();
    await expect.poll(() => storage.getAttribute("data-value")).toBe("8");
    expect(await computed(storage, "background-color")).toBe(accent[scheme]);
    await use.click();
    await expect.poll(() => computed(storage, "background-color")).toBe(danger[scheme]);
    // A battery is best full, so 15% under `low` is its worst.
    expect(await computed(page.locator("#themed-battery > div"), "background-color")).toBe(
      danger[scheme],
    );
  });
});
