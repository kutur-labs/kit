// The header, sidebar and Components popover around every page: the current page shows wherever the
// pages are listed, and the sticky header never covers what focus or the sidebar reaches.
import type { Locator, Page } from "playwright";

import { describe, expect, it } from "vitest";

import { openPanel, slugs, useGallery, variationNamed } from "./gallery.ts";

const { open } = useGallery();

const light = variationNamed("light");

const header = (page: Page) => page.locator("body header").first();

const sidebar = (page: Page) => page.locator("#sidebar");

const bottom = async (locator: Locator) => {
  const box = await locator.boundingBox();

  return (box?.y ?? 0) + (box?.height ?? 0);
};

describe("the sidebar", () => {
  it("scrolls the current page's link into view on load, without moving the page", async () => {
    // A page the sidebar lists below what this screen shows of it, and taller than the screen, so
    // scrolling the link to the top of the viewport, as scrollIntoView does by default, would move
    // the page too.
    const { page } = await open("/popover", { ...light, viewport: { width: 1280, height: 600 } });
    const link = sidebar(page).locator('[aria-current="page"]');

    await expect.poll(() => link.evaluate(inSidebar)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
    ).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  // A finger makes the header's controls taller, and the stuck sidebar starts below them.
  it("sticks where the header ends, under a coarse pointer too", async () => {
    for (const hasTouch of [false, true]) {
      const { page } = await open("/", { ...light, hasTouch });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

      expect((await sidebar(page).boundingBox())?.y, `hasTouch: ${hasTouch}`).toBe(
        await bottom(header(page)),
      );
    }
  });
});

// Whether the element is wholly inside the sidebar's scrollport.
const inSidebar = (element: Element) => {
  const link = element.getBoundingClientRect();
  const scrollport = document.querySelector("#sidebar")?.getBoundingClientRect();

  return scrollport !== undefined && link.top >= scrollport.top && link.bottom <= scrollport.bottom;
};

// Site navigation, so links a keyboard tabs through rather than a menu of actions, whose list
// axe-core finds scrolls with nothing in it to tab to.
describe("the Components popover, on a phone", () => {
  it("links every page and marks the current one alone", async () => {
    const { page } = await open("/tabs", variationNamed("narrow"));

    const panel = await openPanel(
      page.locator("#components-button"),
      page.locator("#foldkit-portal-root #components-panel"),
    );

    const links = panel.getByRole("navigation", { name: "Components" }).getByRole("link");

    expect(await links.count()).toBe(slugs.length);
    expect(await links.and(page.locator('[aria-current="page"]')).allTextContents()).toEqual([
      "Tabs",
    ]);
    expect(
      await panel.getByRole("link", { name: "Button", exact: true }).getAttribute("href"),
    ).toBe("/button");
  });
});

describe("the sticky header", () => {
  // WCAG 2.4.11: what a scroll brings to the top of the viewport stops below the header, with room
  // for the focus ring, which the theme draws 4px outside a control. A finger makes the header
  // taller, so the scroll padding follows the header's height rather than a fixed length. Chromium
  // centres an element it focuses, which no padding moves under the header, so the field is
  // scrolled to its start, as a link to a fragment scrolls.
  it("stops a scroll to a field 0.5rem below it, under a coarse pointer too", async () => {
    for (const hasTouch of [false, true]) {
      const { page } = await open("/fieldset", {
        ...light,
        hasTouch,
        viewport: { width: 1280, height: 420 },
      });

      const field = page.locator("main input").first();
      await field.evaluate((element) => element.scrollIntoView());

      expect((await field.boundingBox())?.y, `hasTouch: ${hasTouch}`).toBe(
        (await bottom(header(page))) + 8,
      );
    }
  });
});
