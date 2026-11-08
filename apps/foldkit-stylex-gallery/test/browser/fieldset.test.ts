import { describe, expect, it } from "vitest";

import { schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Fieldset in the %s scheme", (scheme) => {
  it("dims a control in the themed disabled fieldset once, not once per level", async () => {
    const { page } = await open("/fieldset", scheme);

    const opacity = await page.locator("#themed-delivery-postcode").evaluate((element) => {
      const ancestry = (current: Element | null): ReadonlyArray<Element> =>
        current === null ? [] : [current, ...ancestry(current.parentElement)];

      return ancestry(element).reduce(
        (product, current) => product * Number(getComputedStyle(current).opacity),
        1,
      );
    });

    expect(opacity).toBe(0.5);
  });
});
