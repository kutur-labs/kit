import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

// The theme's accent and on-accent tokens, light-dark(#2563eb, #60a5fa) and
// light-dark(#ffffff, #0b1220), as Chromium computes them.
const accent = { light: "rgb(37, 99, 235)", dark: "rgb(96, 165, 250)" } as const;

const onAccent = { light: "rgb(255, 255, 255)", dark: "rgb(11, 18, 32)" } as const;

describe.each(schemes)("Menu in the %s scheme", (scheme) => {
  it("raises the portaled panel over a backdrop that covers the viewport and closes it on an outside click", async () => {
    const { page } = await open("/menu", scheme);
    const button = page.locator("#actions-button");

    const items = await openPanel(button, page.locator("#foldkit-portal-root #actions-items"));

    expect(await computed(items, "z-index")).toBe("10");
    expect(await computed(button.locator(".."), "position")).toBe("relative");
    expect(await page.locator("#foldkit-portal-root > div:not([role])").boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 900,
    });
    await page.mouse.click(1276, 896);
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
  it("turns the themed chevron, a flex item of the button, while the menu is open", async () => {
    const { page } = await open("/menu", scheme);
    const button = page.locator("#themed-plain-actions-button");
    const chevron = button.locator('[aria-hidden="true"]');

    expect(await computed(chevron, "display")).toBe("block");
    expect(await computed(chevron, "rotate")).toBe("none");
    await openPanel(button, page.locator("#foldkit-portal-root #themed-plain-actions-items"));
    expect(await computed(chevron, "rotate")).toBe("180deg");
  });

  it.each(["plain", "accent"])(
    "keeps the open themed %s menu readable, its active item included, and its items reachable",
    async (variant) => {
      const { page } = await open("/menu", scheme);

      const items = await openPanel(
        page.locator(`#themed-${variant}-actions-button`),
        page.locator(`#foldkit-portal-root #themed-${variant}-actions-items`),
      );

      await items.getByRole("menuitem", { name: "Rename" }).hover();
      await items.locator("[data-active]").waitFor();

      expect(await audit(page, "#foldkit-portal-root")).toEqual([]);
    },
  );

  it("paints the accent menu's active item with the layered accent over the look", async () => {
    const { page } = await open("/menu", scheme);

    const items = await openPanel(
      page.locator("#themed-accent-actions-button"),
      page.locator("#foldkit-portal-root #themed-accent-actions-items"),
    );

    const rename = items.getByRole("menuitem", { name: "Rename" });
    await rename.hover();
    await items.locator("[data-active]").waitFor();

    expect(await computed(rename, "background-color")).toBe(accent[scheme]);
    expect(await computed(rename, "color")).toBe(onAccent[scheme]);
    expect(await computed(rename, "min-height")).toBe("44px");
  });
});
