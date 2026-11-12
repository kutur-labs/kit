import { describe, expect, it } from "vitest";

import { openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Toast in the $colorScheme scheme", (scheme) => {
  it("shows an entry in the corner and removes it when dismissed", async () => {
    const { page } = await open("/toast", scheme);

    const entry = await openPanel(
      page.locator("#demo").getByRole("button", { name: "Fail to save" }),
      page.locator("#notifications [data-variant]"),
    );

    const box = await entry.boundingBox();

    expect(box && box.x + box.width).toBeGreaterThan(scheme.viewport.width - 64);
    expect(box && box.y + box.height).toBeGreaterThan(scheme.viewport.height - 64);
    await entry.getByRole("button", { name: "Dismiss" }).click();
    await expect.poll(() => entry.count()).toBe(0);
  });
});
