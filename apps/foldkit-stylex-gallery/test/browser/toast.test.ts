import { describe, expect, it } from "vitest";

import { openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

describe.each(schemes)("Toast in the %s scheme", (scheme) => {
  it("shows an entry in the corner and removes it when dismissed", async () => {
    const { page } = await open("/toast", scheme);

    const entry = await openPanel(
      page.locator("#core-demo").getByRole("button", { name: "Fail to save" }),
      page.locator("#notifications [data-variant]"),
    );

    const box = await entry.boundingBox();

    expect(box && box.x + box.width).toBeGreaterThan(1280 - 64);
    expect(box && box.y + box.height).toBeGreaterThan(900 - 64);
    await entry.getByRole("button", { name: "Dismiss" }).click();
    await expect.poll(() => entry.count()).toBe(0);
  });

  it("keeps the themed entries readable and their dismiss buttons reachable", async () => {
    const { page } = await open("/toast", scheme);
    const themed = page.locator("#themed-demo");
    const entries = page.locator("#themed-notifications [data-variant]");
    await openPanel(themed.getByRole("button", { name: "Save", exact: true }), entries.nth(0));
    await openPanel(themed.getByRole("button", { name: "Fail to save" }), entries.nth(1));

    expect(await audit(page, "#themed-notifications")).toEqual([]);
  });
});
