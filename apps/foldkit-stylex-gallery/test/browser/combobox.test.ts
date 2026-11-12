import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Combobox in the $colorScheme scheme", (scheme) => {
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
    await page.mouse.click(scheme.viewport.width - 4, scheme.viewport.height - 4);
    await expect.poll(() => items.count()).toBe(0);
  });

  it("lists the items matching the typed text and selects one", async () => {
    const { page } = await open("/combobox", scheme);
    await page.locator("#city-input").fill("kr");

    await expect.poll(() => page.getByRole("option").allTextContents()).toEqual(["Kraków"]);
    await page.getByRole("option", { name: "Kraków" }).click();
    await expect.poll(() => page.locator("#city-input").inputValue()).toBe("Kraków");
  });

  // WCAG 2.5.3: the input's name is its visible label, which stays once a city fills the input.
  it("names the input by a visible label that stays once a city is chosen", async () => {
    const { page } = await open("/combobox", scheme);
    await page.locator("#city-button").click();
    await page.getByRole("option", { name: "Kraków" }).click();

    await expect.poll(() => page.locator("#city-input").inputValue()).toBe("Kraków");
    expect(await page.getByRole("combobox", { name: "City", exact: true }).getAttribute("id")).toBe(
      "city-input",
    );
    expect(await page.locator("#demo").getByText("City", { exact: true }).isVisible()).toBe(true);
  });

  it("keeps the multi-select list open while it toggles items", async () => {
    const { page } = await open("/combobox", scheme);
    await page.locator("#fairs-input").press("ArrowDown");
    await page.getByRole("option", { name: "Poetry" }).click();
    await page.getByRole("option", { name: "Zines" }).click();

    await expect.poll(() => page.getByText("Poetry, Zines").count()).toBe(1);
  });

  it("puts the toggle button over the input's end, a square as tall as the input", async () => {
    const { page } = await open("/combobox", scheme);
    const input = await page.locator("#city-input").boundingBox();
    const button = await page.locator("#city-button").boundingBox();

    expect(button?.height).toBe(input?.height);
    expect(button?.width).toBe(input?.height);
    expect(button?.y).toBe(input?.y);
    expect((button?.x ?? 0) + (button?.width ?? 0)).toBe((input?.x ?? 0) + (input?.width ?? 0));
  });

  it("opens the multi-select list below the field, as wide as it", async () => {
    const { page } = await open("/combobox", scheme);
    // At the top of the viewport, so Floating UI has room below and keeps the list there.
    await page
      .locator("#fairs-input-wrapper")
      .evaluate((field) => field.scrollIntoView({ block: "start" }));

    const items = await openPanel(
      page.locator("#fairs-button"),
      page.locator("#foldkit-portal-root #fairs-items"),
    );

    const field = await page.locator("#fairs-input-wrapper").boundingBox();
    const list = await items.boundingBox();

    expect(list?.width).toBe(field?.width);
    expect(list?.y).toBeGreaterThanOrEqual((field?.y ?? 0) + (field?.height ?? 0));
  });
});
