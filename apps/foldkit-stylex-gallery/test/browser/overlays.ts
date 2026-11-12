// What each page opens, declared once: pages.test.ts audits every page closed and then with each
// of these open, in every variation the toolkit ships, and checks that what opened stayed open
// through the audit. A list opens with a value chosen, so its selected tick is on screen.
import type { Variation } from "@kutur-kit/foldkit-stylex/testing";
import type { Locator, Page } from "playwright";

import { openList, openPanel, pick } from "./gallery.ts";

/**
 * Something a page opens: how a user opens it, resolving with what it opened, and the part the
 * audit then covers.
 */
export type Overlay = Readonly<{
  name: string;
  open: (page: Page) => Promise<Locator>;
  root: string;
  /** Whether the page offers it in a variation; in every variation unless given. */
  isOfferedIn?: (variation: Variation) => boolean;
}>;

const portal = "#foldkit-portal-root";

// A multi-select list stays open while it toggles, so the tick shows without reopening it.
const toggle = async (page: Page, id: string, value: string) => {
  const items = await openList(page, id);
  const option = items.getByRole("option", { name: value, exact: true });
  await option.click();
  await option.and(page.locator('[aria-selected="true"]')).waitFor();

  return items;
};

// Chosen, then the list reopened over its selected item.
const chosen = async (page: Page, id: string, value: string) => {
  await pick(page, id, value);

  return openList(page, id);
};

// The header's Components popover replaces the sidebar below media.stylex.ts's wide, 64rem.
const isPhone = (variation: Variation) => variation.viewport.width < 1024;

/** By page path; a page left out opens nothing. */
export const overlays = {
  "/": [
    { name: "the Scheme picker", open: (page) => openList(page, "scheme"), root: portal },
    { name: "the Tokens picker", open: (page) => openList(page, "tokens"), root: portal },
    {
      name: "the Components popover",
      open: (page) =>
        openPanel(page.locator("#components-button"), page.locator(`${portal} #components-panel`)),
      root: portal,
      isOfferedIn: isPhone,
    },
  ],
  "/combobox": [
    { name: "the City list", open: (page) => chosen(page, "city", "Kraków"), root: portal },
    { name: "the Fairs list", open: (page) => toggle(page, "fairs", "Poetry"), root: portal },
  ],
  "/date-picker": [
    {
      name: "the calendar",
      open: (page) =>
        openPanel(
          page.locator("#due-popover-button"),
          page.locator(`${portal} #due-popover-panel`),
        ),
      root: portal,
    },
  ],
  "/dialog": [
    {
      name: "the dialog",
      open: (page) => openPanel(page.locator("#confirm-trigger"), page.locator("#confirm-panel")),
      root: "#confirm-panel",
    },
  ],
  "/disclosure": [
    {
      name: "the answer",
      open: async (page) => {
        const button = page
          .locator("#demo")
          .getByRole("button", { name: "When will my order ship?" });

        await button.click();
        await button.and(page.locator('[aria-expanded="true"]')).waitFor();

        return page.locator(`#${await button.getAttribute("aria-controls")}`);
      },
      root: "#demo",
    },
  ],
  // Focus opens it at once; visibility, not mounting, shows it.
  "/hover-intent": [
    {
      name: "the panel",
      open: async (page) => {
        await page.locator("#related-trigger").focus();
        const panel = page.locator("#related-panel");
        await panel.waitFor({ state: "visible" });

        return panel;
      },
      root: "#related-panel",
    },
  ],
  "/listbox": [
    {
      name: "the Language list",
      open: (page) => chosen(page, "language", "Deutsch"),
      root: portal,
    },
    { name: "the Tags list", open: (page) => toggle(page, "tags", "Prose"), root: portal },
  ],
  // With its active item, which takes the highlight.
  "/menu": [
    {
      name: "the menu",
      open: async (page) => {
        const items = await openPanel(
          page.locator("#actions-button"),
          page.locator(`${portal} #actions-items`),
        );

        await items.getByRole("menuitem", { name: "Rename" }).hover();
        await items.locator("[data-active]").waitFor();

        return items;
      },
      root: portal,
    },
  ],
  "/popover": ["plain", "inverted"].map((id) => ({
    name: `the ${id} panel`,
    open: (page: Page) =>
      openPanel(page.locator(`#${id}-button`), page.locator(`${portal} #${id}-panel`)),
    root: portal,
  })),
  // The sticky error first: the saved entry leaves after @foldkit/ui's 4 seconds.
  "/toast": [
    {
      name: "two entries",
      open: async (page) => {
        const demo = page.locator("#demo");
        const entries = page.locator("#notifications [data-variant]");
        await openPanel(demo.getByRole("button", { name: "Fail to save" }), entries.nth(0));
        await openPanel(demo.getByRole("button", { name: "Save", exact: true }), entries.nth(1));

        return entries;
      },
      root: "#notifications",
    },
  ],
  "/tooltip": [
    {
      name: "the tooltip",
      open: async (page) => {
        await page.locator("#save-trigger").focus();
        const panel = page.locator(`${portal} #save-panel`);
        await panel.waitFor({ state: "visible" });

        return panel;
      },
      root: portal,
    },
  ],
} satisfies Readonly<Record<string, ReadonlyArray<Overlay>>>;
