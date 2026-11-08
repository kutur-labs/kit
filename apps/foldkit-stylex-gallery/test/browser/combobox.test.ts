import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

describe.each(schemes)("Combobox in the %s scheme", (scheme) => {
  it("raises the portaled list over a backdrop that closes it on an outside click", async () => {
    const { page } = await open("/combobox", scheme);

    const items = await openPanel(
      page.locator("#city-button"),
      page.locator("#foldkit-portal-root #city-items"),
    );

    expect(await computed(items, "z-index")).toBe("10");
    expect(await computed(page.locator("#city-input-wrapper").locator(".."), "position")).toBe(
      "relative",
    );
    expect(await computed(page.locator("#city-backdrop"), "position")).toBe("fixed");
    await page.mouse.click(1276, 896);
    await expect.poll(() => items.count()).toBe(0);
  });

  it("lists the items matching the typed text and selects one", async () => {
    const { page } = await open("/combobox", scheme);
    await page.locator("#city-input").fill("kr");

    await expect.poll(() => page.getByRole("option").allTextContents()).toEqual(["Kraków"]);
    await page.getByRole("option", { name: "Kraków" }).click();
    await expect.poll(() => page.locator("#city-input").inputValue()).toBe("Kraków");
  });

  it("keeps the multi-select list open while it toggles items", async () => {
    const { page } = await open("/combobox", scheme);
    await page.locator("#fairs-input").press("ArrowDown");
    await page.getByRole("option", { name: "Poetry" }).click();
    await page.getByRole("option", { name: "Zines" }).click();

    await expect.poll(() => page.getByText("Poetry, Zines").count()).toBe(1);
  });

  it("puts the themed toggle button over the input's end at a 44px target", async () => {
    const { page } = await open("/combobox", scheme);
    const input = await page.locator("#themed-city-input").boundingBox();
    const button = await page.locator("#themed-city-button").boundingBox();

    expect(button?.height).toBeGreaterThanOrEqual(44);
    expect(button?.width).toBeGreaterThanOrEqual(44);
    expect(button?.y).toBe(input?.y);
    expect((button?.x ?? 0) + (button?.width ?? 0)).toBe((input?.x ?? 0) + (input?.width ?? 0));
  });

  it("opens the themed list below the field, as wide as the app's wider layer", async () => {
    const { page } = await open("/combobox", scheme);
    // At the top of the viewport, so Floating UI has room below and keeps the list there.
    await page
      .locator("#themed-fairs-input-wrapper")
      .evaluate((field) => field.scrollIntoView({ block: "start" }));

    const items = await openPanel(
      page.locator("#themed-fairs-button"),
      page.locator("#foldkit-portal-root #themed-fairs-items"),
    );

    const field = await page.locator("#themed-fairs-input-wrapper").boundingBox();
    const list = await items.boundingBox();

    expect(field?.width).toBe(320);
    expect(list?.width).toBe(field?.width);
    expect(list?.y).toBeGreaterThanOrEqual((field?.y ?? 0) + (field?.height ?? 0));
  });

  it("keeps the open themed list readable and its options reachable", async () => {
    const { page } = await open("/combobox", scheme);
    await openPanel(
      page.locator("#themed-city-button"),
      page.locator("#foldkit-portal-root #themed-city-items"),
    );

    expect(await audit(page, "#foldkit-portal-root")).toEqual([]);
  });
});
