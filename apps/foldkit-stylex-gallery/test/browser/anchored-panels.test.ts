// What is inline on each anchored panel once Floating UI has placed it. Scene runs no Mount, so the
// core's test/drift/inline sees only what the views write; this sees what @foldkit/ui adds in the
// browser, and the canary runs it against @foldkit/ui's newest release. An inline style beats an
// app's class, so each property here must belong to the part's family in
// packages/foldkit-stylex/src/internal/owned.ts, which the gallery cannot import.
import type { Locator, Page } from "playwright";

import { describe, expect, it } from "vitest";

import { viewportPadding } from "../../src/anchor.ts";
import { useGallery, variationNamed } from "./gallery.ts";

const { open } = useGallery();

// The non-custom properties in an element's style attribute, as StyleX names them. The CSSOM
// lists longhands, so the margin the views write shows as marginTop, marginRight and so on.
const inlineProperties = (locator: Locator) =>
  locator.evaluate((element) =>
    Array.from(element.style)
      .filter((property) => !property.startsWith("--"))
      .map((property) =>
        property.replace(/-([a-z])/g, (_dash, letter: string) => letter.toUpperCase()),
      )
      .sort(),
  );

// The view renders the panel hidden; Floating UI clears its visibility once it has placed it.
const untilPlaced = (panel: Locator) =>
  expect.poll(() => panel.evaluate((element) => element.style.visibility)).toBe("");

// The views write position and margin; Floating UI writes left, top and maxHeight.
const placed = [
  "left",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxHeight",
  "position",
  "top",
];

// Floating UI makes a panel without an arrow scroll; a scrolling panel would clip its arrow.
const scrolling = [...placed, "overflowY", "overscrollBehaviorX", "overscrollBehaviorY"].sort();

type Part = Readonly<{
  /** The part as `Owns` in owned.ts names it, its family there and its element. */
  part: string;
  family: string;
  element: string;
  /** The properties inline on it once the panel is placed. */
  inline: ReadonlyArray<string>;
}>;

type Anchored = Readonly<{
  /** The case, named after its component. */
  title: string;
  component: string;
  path: string;
  /** Opens the panel as a user does. */
  show: (page: Page) => Promise<void>;
  panel: string;
  /** The `position` Floating UI places the panel with: fixed when its trigger is in a fixed box. */
  strategy: "absolute" | "fixed";
  parts: ReadonlyArray<Part>;
}>;

const click = (trigger: string) => (page: Page) => page.locator(trigger).click();

const anchored: ReadonlyArray<Anchored> = [
  {
    title: "Popover, with an arrow",
    component: "Popover",
    path: "/popover",
    show: click("#plain-button"),
    panel: "#plain-panel",
    strategy: "absolute",
    parts: [
      { part: "panel", family: "AnchoredPanel", element: "#plain-panel", inline: placed },
      { part: "arrow", family: "Arrow", element: "#plain-arrow", inline: [] },
    ],
  },
  {
    title: "Listbox",
    component: "Listbox",
    path: "/listbox",
    show: click("#language-button"),
    panel: "#language-items",
    strategy: "absolute",
    parts: [
      { part: "items", family: "AnchoredPanel", element: "#language-items", inline: scrolling },
    ],
  },
  {
    title: "Listbox, its trigger in a position: fixed box",
    component: "Listbox",
    path: "/listbox",
    show: async (page) => {
      await page.addStyleTag({ content: "#demo { position: fixed }" });
      await page.locator("#language-button").click();
    },
    panel: "#language-items",
    strategy: "fixed",
    parts: [
      { part: "items", family: "AnchoredPanel", element: "#language-items", inline: scrolling },
    ],
  },
  {
    title: "Menu",
    component: "Menu",
    path: "/menu",
    show: click("#actions-button"),
    panel: "#actions-items",
    strategy: "absolute",
    parts: [
      { part: "items", family: "AnchoredPanel", element: "#actions-items", inline: scrolling },
    ],
  },
  {
    title: "Combobox",
    component: "Combobox",
    path: "/combobox",
    show: click("#city-button"),
    panel: "#city-items",
    strategy: "absolute",
    parts: [{ part: "items", family: "AnchoredPanel", element: "#city-items", inline: scrolling }],
  },
  {
    title: "DatePicker, whose panel is a Popover's without an arrow",
    component: "DatePicker",
    path: "/date-picker",
    show: click("#due-popover-button"),
    panel: "#due-popover-panel",
    strategy: "absolute",
    parts: [
      { part: "panel", family: "AnchoredPanel", element: "#due-popover-panel", inline: scrolling },
    ],
  },
  {
    title: "Tooltip",
    component: "Tooltip",
    path: "/tooltip",
    // Focus from the keyboard opens a tooltip at once.
    show: (page) => page.locator("#save-trigger").focus(),
    panel: "#save-panel",
    strategy: "absolute",
    parts: [
      {
        part: "panel",
        family: "TooltipPanel",
        element: "#save-panel",
        inline: [...scrolling, "pointerEvents"].sort(),
      },
    ],
  },
];

describe("the properties inline on an anchored panel's parts once Floating UI places it", () => {
  it.each(anchored)("$title", async ({ component, path, show, panel, strategy, parts }) => {
    const { page } = await open(path, variationNamed("light"));
    await show(page);
    await untilPlaced(page.locator(panel));

    expect(await page.locator(panel).evaluate((element) => element.style.position)).toBe(strategy);

    for (const { part, family, element, inline } of parts) {
      expect(
        await inlineProperties(page.locator(element)),
        `@foldkit/ui changed what it writes inline on ${component}.${part}. Add each new property to the members of the ${family} family in packages/foldkit-stylex/src/internal/owned.ts and to the ones it says @foldkit/ui writes, so the part's styles cannot set what an inline style overrides. Then update this list.`,
      ).toEqual(inline);
    }
  });
});

// A phone on its side: short, and under a finger, so controls are 44px tall. The header's pickers
// and the Components popover, which replaces the sidebar on a screen this narrow, open panels too.
const landscape = { ...variationNamed("touch"), viewport: { width: 740, height: 360 } };

const opened: ReadonlyArray<Pick<Anchored, "title" | "path" | "show" | "panel">> = [
  ...anchored,
  { title: "Scheme picker", path: "/", show: click("#scheme-button"), panel: "#scheme-items" },
  { title: "Tokens picker", path: "/", show: click("#tokens-button"), panel: "#tokens-items" },
  {
    title: "Components popover",
    path: "/",
    show: click("#components-button"),
    panel: "#components-panel",
  },
];

describe("on a landscape phone", () => {
  it.each(opened)(
    "keeps the $title panel clear of the screen's edges",
    async ({ path, show, panel }) => {
      const { page } = await open(path, landscape);
      await show(page);
      await untilPlaced(page.locator(panel));
      const box = await page.locator(panel).boundingBox();
      const { width, height } = landscape.viewport;

      const insets = {
        left: box?.x ?? 0,
        top: box?.y ?? 0,
        right: width - (box?.x ?? 0) - (box?.width ?? 0),
        bottom: height - (box?.y ?? 0) - (box?.height ?? 0),
      };

      expect(Math.min(...Object.values(insets)), JSON.stringify(insets)).toBeGreaterThanOrEqual(
        viewportPadding,
      );
    },
  );
});
