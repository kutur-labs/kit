// The theme's tokens in the browser: light-dark() kept through the build, color-scheme switching
// them, and --fks-* values reaching panels that @foldkit/ui portals out of the page.
import type { Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The theme's surface token, light-dark(#ffffff, #18181b), as Chromium computes it.
const surface = { light: "rgb(255, 255, 255)", dark: "rgb(24, 24, 27)" } as const;

// The inverted demo's surface on its panel, light-dark(#18181b, #fafafa).
const inverted = { light: "rgb(24, 24, 27)", dark: "rgb(250, 250, 250)" } as const;

// The Paper preset's surface, light-dark(#fffbeb, #1c1917).
const paper = { light: "rgb(255, 251, 235)", dark: "rgb(28, 25, 23)" } as const;

const openPopover = (page: Page, id: string) =>
  openPanel(page.locator(`#${id}-button`), page.locator(`#foldkit-portal-root #${id}-panel`));

describe("the theme", () => {
  it("keeps light-dark() in the built CSS instead of reading Lightningcss's variables", async () => {
    const { page } = await open("/popover", "light");

    const rules = await page.evaluate(() =>
      Array.from(document.styleSheets).flatMap((sheet) =>
        Array.from(sheet.cssRules, (rule) => rule.cssText),
      ),
    );

    expect(rules.some((rule) => rule.includes("light-dark("))).toBe(true);
    expect(rules.filter((rule) => rule.includes("var(--lightningcss"))).toEqual([]);
  });

  it.each(schemes)("colors a portaled panel from the %s scheme", async (scheme) => {
    const { page } = await open("/popover", scheme);
    const panel = await openPopover(page, "themed-plain");

    expect(await computed(panel, "background-color")).toBe(surface[scheme]);
  });

  it("follows the color-scheme the picker sets on <html>, against the system's", async () => {
    const { page } = await open("/popover", "light");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    const panel = await openPopover(page, "themed-plain");

    expect(await computed(panel, "background-color")).toBe(surface.dark);
  });

  it.each(schemes)(
    "reaches a portaled panel with tokens set on the part, in %s",
    async (scheme) => {
      const { page } = await open("/popover", scheme);
      const panel = await openPopover(page, "themed-inverted");

      expect(await computed(panel, "background-color")).toBe(inverted[scheme]);
    },
  );

  it("recolors an open portaled panel when a --fks-* property on <html> changes", async () => {
    const { page } = await open("/popover", "light");
    const panel = await openPopover(page, "themed-plain");
    await page.evaluate(() =>
      document.documentElement.style.setProperty("--fks-color-surface", "rgb(1, 2, 3)"),
    );

    expect(await computed(panel, "background-color")).toBe("rgb(1, 2, 3)");
  });

  // The picker sits under the open panel's backdrop, so each preset is chosen before opening.
  it.each(schemes)(
    "applies a token preset from the picker to portaled panels, in %s",
    async (scheme) => {
      const { page } = await open("/popover", scheme);
      await page.getByRole("button", { name: "Paper", exact: true }).click();

      expect(await computed(await openPopover(page, "themed-plain"), "background-color")).toBe(
        paper[scheme],
      );
    },
  );

  it("restores the theme's defaults when the picker returns to Kit", async () => {
    const { page } = await open("/popover", "light");
    await page.getByRole("button", { name: "Paper", exact: true }).click();
    await page.getByRole("button", { name: "Kit", exact: true }).click();

    expect(await page.evaluate(() => document.documentElement.style.cssText)).toBe("");
    expect(await computed(await openPopover(page, "themed-plain"), "background-color")).toBe(
      surface.light,
    );
  });
});
