// The theme's tokens in the browser: light-dark() kept through the build, color-scheme switching
// them, --fks-* values reaching panels that @foldkit/ui portals out of the page, and state kept
// visible under forced colors.
import type { Locator, Page } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, isFocused, openPanel, schemes, tabInto, useGallery } from "./gallery.ts";

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

// A state a themed part shows, and how a test changes it. `before` brings the part into view.
type StateChange = Readonly<{
  state: string;
  path: string;
  part: (page: Page) => Locator;
  before?: (page: Page) => Promise<void>;
  change: (page: Page) => Promise<void>;
  // CSS for the screenshots, which leaves out what the state changes besides color, such as where
  // a thumb sits.
  style?: string;
}>;

const themed = (page: Page) => page.locator("#themed-demo");

const portaled = (page: Page) => page.locator("#foldkit-portal-root");

// Clicks an empty corner of the page, so that neither the pointer nor focus rests on the part.
// Forced colors draw both on a button, and Chromium keeps painting a focused button's edge in
// Highlight after it loses focus, so no part a test screenshots is ever given focus.
const leave = (page: Page) => page.mouse.click(1276, 896);

const stateChanges: ReadonlyArray<StateChange> = [
  {
    state: "a switch turned off",
    path: "/switch",
    part: (page) => themed(page).getByRole("switch", { name: "Notifications" }),
    // Through the label, which leaves focus where it was.
    change: async (page) => {
      await themed(page).getByText("Notifications", { exact: true }).click();
      await expect
        .poll(() =>
          themed(page).getByRole("switch", { name: "Notifications" }).getAttribute("aria-checked"),
        )
        .toBe("false");
      await leave(page);
    },
  },
  {
    state: "a radio option's mark once another is selected",
    path: "/radio-group",
    part: (page) => themed(page).getByRole("radio").first().locator("span").first(),
    change: async (page) => {
      const pro = themed(page).getByRole("radio").nth(1);
      await pro.click();
      await expect.poll(() => pro.getAttribute("aria-checked")).toBe("true");
      await leave(page);
    },
  },
  {
    state: "a progress bar's value",
    path: "/progress",
    part: (page) => page.locator("#themed-upload > div"),
    change: async (page) => {
      await themed(page).getByRole("button", { name: "Advance" }).click();
      await expect
        .poll(() => page.locator("#themed-upload").getAttribute("aria-valuenow"))
        .toBe("50");
      await leave(page);
    },
  },
  {
    state: "a meter's value",
    path: "/meter",
    part: (page) => page.locator("#themed-storage"),
    change: async (page) => {
      await themed(page).getByRole("button", { name: "Use 2 GB" }).click();
      await expect
        .poll(() => page.locator("#themed-storage > div").getAttribute("data-value"))
        .toBe("6");
      await leave(page);
    },
  },
  {
    state: "a slider's value",
    path: "/slider",
    part: (page) => page.locator("#themed-volume-thumb").locator(".."),
    change: async (page) => {
      const thumb = page.locator("#themed-volume-thumb");
      await thumb.press("End");
      await expect.poll(() => thumb.getAttribute("aria-valuenow")).toBe("100");
      await leave(page);
    },
    style: "#themed-volume-thumb { visibility: hidden; }",
  },
  {
    state: "a calendar day once selected",
    path: "/calendar",
    part: (page) => page.locator("#themed-deadline-cell-2026-11-9 button"),
    // With the keyboard, from today: the grid keeps focus, so the day's button never takes it.
    change: async (page) => {
      await page.locator("#themed-deadline-grid").focus();
      await page.keyboard.press("ArrowRight");
      await page.locator("#themed-deadline-cell-2026-11-9[data-focused]").waitFor();
      await page.keyboard.press("Enter");
      await expect
        .poll(() => themed(page).locator("p").textContent())
        .toBe("Selected November 9, 2026.");
      await leave(page);
    },
    // The demo rounds the selected day, which shows without color.
    style: "#themed-deadline-grid button { border-radius: 0 !important; }",
  },
  {
    state: "a list item once another is active",
    path: "/listbox",
    part: (page) => portaled(page).getByRole("option", { name: "Polski" }),
    before: async (page) => {
      await openPanel(
        page.locator("#themed-language-button"),
        portaled(page).locator("#themed-language-items"),
      );
      await portaled(page).getByRole("option", { name: "Polski" }).hover();
    },
    change: (page) => portaled(page).getByRole("option", { name: "English" }).hover(),
  },
  {
    state: "a tab once another is active",
    path: "/tabs",
    part: (page) => page.locator("#themed-sections-tab-0"),
    change: async (page) => {
      const notes = page.locator("#themed-sections-tab-1");
      await notes.click();
      await expect.poll(() => notes.getAttribute("aria-selected")).toBe("true");
      await leave(page);
    },
  },
];

// What Chromium computes for a system color, read from an element of the test's own.
const systemColor = (page: Page, value: string) =>
  page.evaluate((value) => {
    const probe = document.createElement("div");
    probe.style.color = value;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();

    return color;
  }, value);

// Windows High Contrast: the browser swaps each color that is not a system color for one of the
// user's and drops shadows, so a state drawn in the theme's own colors would not show.
describe.each(schemes)("the theme under forced colors, in the %s scheme", (scheme) => {
  // GrayText is the color Windows keeps for disabled content.
  it("leaves an enabled button's edge to the browser, not GrayText", async () => {
    const { page } = await open("/button", scheme, { forcedColors: "active" });
    // Reset has the look's own edge, and is enabled once the count is above 0.
    const reset = themed(page).getByRole("button", { name: "Reset" });
    await themed(page).getByRole("button", { name: "Add one" }).click();
    await expect.poll(() => reset.isEnabled()).toBe(true);
    await leave(page);

    expect(
      await computed(reset, "border-top-color"),
      "Leave edges in a color that is not a system color, so the browser draws them in its own.",
    ).not.toBe(await systemColor(page, "GrayText"));
  });

  // The browser would turn these fills into the background.
  it("draws a list separator in GrayText", async () => {
    const { page } = await open("/menu", scheme, { forcedColors: "active" });
    await openPanel(
      page.locator("#themed-plain-actions-button"),
      portaled(page).locator("#themed-plain-actions-items"),
    );

    expect(await computed(portaled(page).getByRole("separator").first(), "background-color")).toBe(
      await systemColor(page, "GrayText"),
    );
  });

  it("draws the empty part of a track in GrayText", async () => {
    const { page } = await open("/progress", scheme, { forcedColors: "active" });

    expect(await computed(page.locator("#themed-upload > div"), "background-color")).toBe(
      await systemColor(page, "GrayText"),
    );
  });

  it.each(stateChanges)("repaints $state", async ({ path, part, before, change, style }) => {
    const { page } = await open(path, scheme, { forcedColors: "active" });
    await before?.(page);

    const screenshot = () => part(page).screenshot({ animations: "disabled", style: style ?? "" });

    const unchanged = await screenshot();
    await change(page);

    expect(
      (await screenshot()).equals(unchanged),
      "Draw the state in a token that is a system color under forced colors.",
    ).toBe(false);
  });
});

// Every focusable part takes the same ring, for keyboard focus alone: a pointer user who clicks a
// button sees none. A text field takes the ring on a click too, since it takes keyboard input.
describe("the theme's focus ring", () => {
  it.each([
    {
      control: "a button",
      path: "/button",
      find: (page: Page) => themed(page).getByRole("button", { name: "Add one" }),
    },
    { control: "a field", path: "/input", find: (page: Page) => page.locator("#themed-email") },
  ])("rings $control that Tab reaches", async ({ path, find }) => {
    const { page } = await open(path, "light");
    await tabInto(page, "themed");

    expect(await isFocused(find(page))).toBe(true);
    expect(await computed(find(page), "outline-style")).toBe("solid");
  });

  it("leaves a button the pointer clicks without a ring", async () => {
    const { page } = await open("/button", "light");
    const button = themed(page).getByRole("button", { name: "Add one" });
    await button.click();

    expect(await isFocused(button)).toBe(true);
    expect(await computed(button, "outline-style")).toBe("none");
  });
});
