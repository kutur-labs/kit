import type { Locator } from "playwright";

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

// Where a track's indeterminate indicator lies, in track widths from the track's inline start,
// with its sweep paused at a share of its duration.
const sweptTo = (track: Locator, share: number) =>
  track.locator("> div").evaluate((indicator, share) => {
    const [sweep] = indicator.getAnimations();

    if (sweep === undefined) throw new Error("The indicator runs no animation.");
    sweep.pause();
    sweep.currentTime = share * Number(sweep.effect?.getComputedTiming().duration);

    const { left, right } = indicator.getBoundingClientRect();
    const box = indicator.parentElement?.getBoundingClientRect();

    if (box === undefined) throw new Error("The indicator has no track.");

    const [start, end] =
      document.documentElement.dir === "rtl"
        ? [box.right - right, box.right - left]
        : [left - box.left, right - box.left];

    return { start: start / box.width, end: end / box.width };
  }, share);

describe.each(["ltr", "rtl"])("Progress in the %s direction", (dir) => {
  it.each(["sync", "themed-sync"])(
    "sweeps #%s's indicator in from before the track's inline start",
    async (id) => {
      const { page } = await open("/progress", "light", { reducedMotion: "no-preference" });
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
      }, dir);
      const track = page.locator(`#${id} > div`);
      const start = await sweptTo(track, 0);
      const quarter = await sweptTo(track, 0.25);

      expect(start.end).toBeLessThanOrEqual(0);
      expect(quarter.start).toBeGreaterThan(start.start);
      expect(quarter.end).toBeGreaterThan(0);
    },
  );
});
