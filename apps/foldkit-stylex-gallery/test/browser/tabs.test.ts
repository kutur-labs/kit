import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Tabs in the $colorScheme scheme", (scheme) => {
  // The demo mounts every panel and gives it display: block.
  it("shows only the active panel, after a click too", async () => {
    const { page } = await open("/tabs", scheme);

    const displays = () =>
      Promise.all(
        [0, 1, 2].map((index) => computed(page.locator(`#sections-panel-${index}`), "display")),
      );

    expect(await displays()).toEqual(["block", "none", "none"]);
    await page.locator("#sections-tab-1").click();
    await expect.poll(displays).toEqual(["none", "block", "none"]);
  });
});
