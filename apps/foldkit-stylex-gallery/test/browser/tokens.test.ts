// The theme's color pairs under each preset the Tokens picker applies, measured in the built
// gallery by the theme's tokenContrast, in light and dark at once. The inverted Popover panel sets
// its own surface and text, so its pairs and greys are measured on the panel.
import { tokenContrast } from "@kutur-kit/foldkit-stylex-theme/testing";
import { describe, expect, it } from "vitest";

import { Preset } from "../../src/presets.ts";
import { openPanel, pick, useGallery, variationNamed } from "./gallery.ts";

const { open } = useGallery();

describe.each(Preset.literals)("the %s preset", (preset) => {
  it("keeps every color pair's contrast", async () => {
    const { page } = await open("/popover", variationNamed("light"));
    await pick(page, "tokens", preset);

    expect(await page.evaluate(tokenContrast, {})).toEqual([]);
  });

  it("keeps the inverted panel's pairs, with greys mixed from its own colors", async () => {
    const { page } = await open("/popover", variationNamed("light"));
    await pick(page, "tokens", preset);
    await openPanel(
      page.locator("#inverted-button"),
      page.locator("#foldkit-portal-root #inverted-panel"),
    );

    expect(await page.evaluate(tokenContrast, { part: "#inverted-panel" })).toEqual([]);
  });
});
