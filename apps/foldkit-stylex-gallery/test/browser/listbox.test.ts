import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Listbox in the $colorScheme scheme", (scheme) => {
  it("raises the portaled list over a backdrop that closes it on an outside click", async () => {
    const { page } = await open("/listbox", scheme);

    const items = await openPanel(
      page.locator("#language-button"),
      page.locator("#foldkit-portal-root #language-items"),
    );

    expect(await computed(items, "z-index")).toBe("10");
    expect(await computed(page.locator("#language-button").locator(".."), "position")).toBe(
      "relative",
    );
    await page.mouse.click(scheme.viewport.width - 4, scheme.viewport.height - 4);
    await expect.poll(() => items.count()).toBe(0);
  });

  it("selects an item from the styled list", async () => {
    const { page } = await open("/listbox", scheme);
    await page.locator("#language-button").click();
    await page.getByRole("option", { name: "Deutsch" }).click();

    await expect.poll(() => page.locator("#language-button").textContent()).toBe("Deutsch");
  });

  // WCAG 2.5.3: the button's name starts with the visible label, which stays once a value shows.
  it("names the button by its visible label, then the value it shows", async () => {
    const { page } = await open("/listbox", scheme);
    await page.locator("#language-button").click();
    await page.getByRole("option", { name: "Deutsch" }).click();

    await expect
      .poll(() => page.getByRole("button", { name: "Language Deutsch", exact: true }).count())
      .toBe(1);
    expect(await page.locator("#demo").getByText("Language", { exact: true }).isVisible()).toBe(
      true,
    );
  });

  it("opens the list as wide as its button", async () => {
    const { page } = await open("/listbox", scheme);
    const button = page.locator("#language-button");
    const items = await openPanel(button, page.locator("#foldkit-portal-root #language-items"));

    expect((await items.boundingBox())?.width).toBe((await button.boundingBox())?.width);
  });

  // An inline box ignores rotate, whatever it computes to; a flex item of the content element turns.
  it("puts the chevron at the button's end and turns it while the list is open", async () => {
    const { page } = await open("/listbox", scheme);
    const button = page.locator("#language-button");
    const chevron = button.locator("svg");

    const contentEnd = await button.evaluate((element) => {
      const style = getComputedStyle(element);

      return (
        element.getBoundingClientRect().right -
        Number.parseFloat(style.paddingRight) -
        Number.parseFloat(style.borderRightWidth)
      );
    });

    expect(await chevron.evaluate((mark) => mark.getBoundingClientRect().right)).toBe(contentEnd);
    expect(await computed(chevron, "display")).toBe("block");
    expect(await computed(chevron, "rotate")).toBe("none");
    await openPanel(button, page.locator("#foldkit-portal-root #language-items"));
    expect(await computed(chevron, "rotate")).toBe("180deg");
  });

  it("keeps the chevron and ticks out of what assistive technology reads", async () => {
    const { page } = await open("/listbox", scheme);
    const button = page.locator("#language-button");

    const items = await openPanel(button, page.locator("#foldkit-portal-root #language-items"));

    expect(await button.ariaSnapshot()).toBe('- button "Language None" [expanded]: None');
    expect(await items.getByRole("option").first().ariaSnapshot()).toBe('- option "Polski"');
  });
});
