import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// Each demo's list holds 10,000 rows of 44px in a container 240px high.
const rowCount = 10_000;

describe.each(schemes)("VirtualList in the %s scheme", (scheme) => {
  it.each(["issues", "themed-issues"])(
    "scrolls #%s inside its bounded container, mounting only the rows in view",
    async (id) => {
      const { page } = await open("/virtual-list", scheme);
      const container = page.locator(`#${id}`);
      const rows = container.locator('[role="listitem"]');

      await expect.poll(() => rows.count()).toBeGreaterThan(0);
      expect(await container.evaluate((element) => element.clientHeight)).toBe(240);
      expect(await computed(container, "overflow-y")).toBe("auto");
      expect(await rows.count()).toBeLessThan(30);
      expect(await rows.first().getAttribute("aria-setsize")).toBe(String(rowCount));

      await container.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
      await expect.poll(() => rows.last().getAttribute("aria-posinset")).toBe(String(rowCount));
      expect(await rows.count()).toBeLessThan(30);
    },
  );
});
