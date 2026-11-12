import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Menu in the $colorScheme scheme", (scheme) => {
  it("raises the portaled panel over a backdrop that covers the viewport and closes it on an outside click", async () => {
    const { page } = await open("/menu", scheme);
    const button = page.locator("#actions-button");

    const items = await openPanel(button, page.locator("#foldkit-portal-root #actions-items"));

    expect(await computed(items, "z-index")).toBe("10");
    expect(await computed(button.locator(".."), "position")).toBe("relative");
    expect(await page.locator("#foldkit-portal-root > div:not([role])").boundingBox()).toEqual({
      x: 0,
      y: 0,
      ...scheme.viewport,
    });
    await page.mouse.click(scheme.viewport.width - 4, scheme.viewport.height - 4);
    await expect.poll(() => items.count()).toBe(0);
  });

  it("separates the groups with the styled separator and names each by its heading", async () => {
    const { page } = await open("/menu", scheme);

    const items = await openPanel(
      page.locator("#actions-button"),
      page.locator("#foldkit-portal-root #actions-items"),
    );

    expect(await items.getByRole("separator").count()).toBe(1);
    expect(
      await items.getByRole("group", { name: "Manage" }).getByRole("menuitem").allTextContents(),
    ).toEqual(["Archive", "Delete"]);
  });

  it("closes on a chosen action and reports it", async () => {
    const { page } = await open("/menu", scheme);

    const items = await openPanel(
      page.locator("#actions-button"),
      page.locator("#foldkit-portal-root #actions-items"),
    );

    await items.getByRole("menuitem", { name: "Duplicate" }).click();

    await expect.poll(() => items.count()).toBe(0);
    expect(await page.getByText("Chose Duplicate.").count()).toBe(1);
  });

  // An inline box ignores rotate, whatever it computes to; a flex item of the button turns.
  it("turns the chevron, a flex item of the button, while the menu is open", async () => {
    const { page } = await open("/menu", scheme);
    const button = page.locator("#actions-button");
    const chevron = button.locator("svg");

    expect(await computed(chevron, "display")).toBe("block");
    expect(await computed(chevron, "rotate")).toBe("none");
    await openPanel(button, page.locator("#foldkit-portal-root #actions-items"));
    expect(await computed(chevron, "rotate")).toBe("180deg");
  });
});
