import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The demo's list holds 10,000 rows of 36px in a container 240px high.
const rowCount = 10_000;

describe.each(schemes)("VirtualList in the $colorScheme scheme", (scheme) => {
  it("scrolls inside its bounded container, mounting only the rows in view", async () => {
    const { page } = await open("/virtual-list", scheme);
    const container = page.locator("#issues");
    const rows = container.locator('[role="listitem"]');

    await expect.poll(() => rows.count()).toBeGreaterThan(0);
    expect(await container.evaluate((element) => element.clientHeight)).toBe(240);
    expect(await computed(container, "overflow-y")).toBe("auto");
    expect(await rows.count()).toBeLessThan(30);
    expect(await rows.first().getAttribute("aria-setsize")).toBe(String(rowCount));

    await container.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect.poll(() => rows.last().getAttribute("aria-posinset")).toBe(String(rowCount));
    expect(await rows.count()).toBeLessThan(30);
  });
});
