import { describe, expect, it } from "vitest";

import { Preset } from "../../src/presets.ts";
import { computed, contrast, pick, rgba, schemes, settled, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Button in the $colorScheme scheme", (scheme) => {
  // WCAG 1.4.3 holds under the pointer too: the hover's fill must keep the label's 4.5:1.
  it.each(Preset.literals)(
    "keeps the primary label's contrast under the pointer in %s",
    async (preset) => {
      const { page } = await open("/button", scheme);

      if (preset !== "Kit") await pick(page, "tokens", preset);
      const button = page.locator("#example-1 button");
      await button.hover();
      await settled(button);

      const [label, fill] = await Promise.all(
        ["color", "background-color"].map((property) =>
          computed(button, property).then((color) => rgba(page, color)),
        ),
      );

      expect(contrast(label ?? [0, 0, 0, 1], fill ?? [0, 0, 0, 1])).toBeGreaterThanOrEqual(4.5);
    },
  );
});
