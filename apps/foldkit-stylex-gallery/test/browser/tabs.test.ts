import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Tabs in the %s scheme", (scheme) => {
  // Both demos mount every panel and give it display: block.
  it.each(["sections", "themed-sections"])(
    "shows only the active panel of #%s, after a click too",
    async (id) => {
      const { page } = await open("/tabs", scheme);

      const displays = () =>
        Promise.all(
          [0, 1, 2].map((index) => computed(page.locator(`#${id}-panel-${index}`), "display")),
        );

      expect(await displays()).toEqual(["block", "none", "none"]);
      await page.locator(`#${id}-tab-1`).click();
      await expect.poll(displays).toEqual(["none", "block", "none"]);
    },
  );
});
