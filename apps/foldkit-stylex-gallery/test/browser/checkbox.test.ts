import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Checkbox in the %s scheme", (scheme) => {
  it.each(["core", "themed"])("shows the %s demo's tick once a click checks it", async (demo) => {
    const { page } = await open("/checkbox", scheme);
    const checkbox = page.locator(`#${demo}-demo`).getByRole("checkbox");
    const tick = checkbox.locator("span");

    expect(await computed(tick, "opacity")).toBe("0");
    await checkbox.click();
    await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("true");
    expect(await computed(tick, "opacity")).toBe("1");
  });
});
