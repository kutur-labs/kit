import { describe, expect, it } from "vitest";

import { schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Progress in the %s scheme", (scheme) => {
  it.each(["upload", "themed-upload"])(
    "fills #%s's track to the value's share and its full height",
    async (id) => {
      const { page } = await open("/progress", scheme);
      const track = page.locator(`#${id} > div`);
      const [t, i] = await Promise.all([track.boundingBox(), track.locator("> div").boundingBox()]);

      if (!t || !i) throw new Error(`#${id} rendered no track or indicator.`);

      expect(i.width / t.width).toBeCloseTo(0.25, 2);
      expect(i.height).toBe(t.height);
    },
  );

  // @foldkit/ui sets no width on an indeterminate indicator; the styles have to give it one.
  it.each(["sync", "themed-sync"])("shows #%s's indeterminate indicator", async (id) => {
    const { page } = await open("/progress", scheme);
    const track = page.locator(`#${id} > div`);
    const [t, i] = await Promise.all([track.boundingBox(), track.locator("> div").boundingBox()]);

    if (!t || !i) throw new Error(`#${id} rendered no track or indicator.`);

    expect(i.width).toBeGreaterThan(0);
    expect(i.height).toBe(t.height);
  });
});
