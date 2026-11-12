// The theme's tokens in the browser: light-dark() and the mixed greys kept through the build,
// color-scheme switching them, --fks-* values reaching panels that @foldkit/ui portals out of the
// page, motion that leaves colors alone and fades without moving under reduced motion, and the
// system colors it picks under forced colors. The toolkit's `audit` checks what every page must
// meet, in pages.test.ts; these check how the theme meets it.
import type { Locator, Page } from "playwright";

import { describe, expect, it } from "vitest";

import {
  computed,
  findings,
  isFocused,
  openPanel,
  pick,
  rgba,
  schemes,
  slugs,
  tabInto,
  useGallery,
  variationNamed,
} from "./gallery.ts";

const { open } = useGallery();

const light = variationNamed("light");

// The theme's surface token, light-dark(#ffffff, #111113), as Chromium computes it.
const surface = { light: "rgb(255, 255, 255)", dark: "rgb(17, 17, 19)" } as const;

// The inverted example's surface on its panel, light-dark(#18181b, #fafafa).
const inverted = { light: "rgb(24, 24, 27)", dark: "rgb(250, 250, 250)" } as const;

// The Paper preset's surface, light-dark(#fffbeb, #1c1917).
const paper = { light: "rgb(255, 251, 235)", dark: "rgb(28, 25, 23)" } as const;

// The subtle token, 5% of the text color mixed into the surface in OKLab: #f2f2f2 in light and
// #1a1a1c in dark, as 8-bit channels and alpha. Firefox and WebKit are checked against these by
// hand; if one mixes differently, the theme sets these values as literals instead.
const subtle = { light: [242, 242, 242, 1], dark: [26, 26, 28, 1] } as const;

// The values a property takes in every rule of the page's stylesheets, media rules included.
const declared = (page: Page, property: string) =>
  page.evaluate((property) => {
    const valuesIn = (rules: CSSRuleList): ReadonlyArray<string> =>
      Array.from(rules).flatMap((rule) => [
        ...(rule instanceof CSSStyleRule && rule.style.getPropertyValue(property) !== ""
          ? [rule.style.getPropertyValue(property)]
          : []),
        ...(rule instanceof CSSGroupingRule ? valuesIn(rule.cssRules) : []),
      ]);

    return Array.from(document.styleSheets).flatMap((sheet) => valuesIn(sheet.cssRules));
  }, property);

// The items of a comma-separated list, with what each function holds left out:
// `var(--a, 1s), 0s` lists `var` and `0s`.
const itemsOf = (list: string) => {
  const flat = (value: string): string =>
    value.includes("(") ? flat(value.replaceAll(/\([^()]*\)/g, "")) : value;

  return flat(list)
    .split(",")
    .map((item) => item.trim());
};

const demo = (page: Page) => page.locator("#demo");

const portaled = (page: Page) => page.locator("#foldkit-portal-root");

const openPopover = (page: Page, id: string) =>
  openPanel(page.locator(`#${id}-button`), page.locator(`#foldkit-portal-root #${id}-panel`));

describe("the theme", () => {
  it("keeps light-dark() in the built CSS instead of reading Lightningcss's variables", async () => {
    const { page } = await open("/popover", light);

    const rules = await page.evaluate(() =>
      Array.from(document.styleSheets).flatMap((sheet) =>
        Array.from(sheet.cssRules, (rule) => rule.cssText),
      ),
    );

    expect(rules.some((rule) => rule.includes("light-dark("))).toBe(true);
    expect(rules.filter((rule) => rule.includes("var(--lightningcss"))).toEqual([]);
  });

  it.each(schemes)("colors a portaled panel from the $colorScheme scheme", async (scheme) => {
    const { page } = await open("/popover", scheme);
    const panel = await openPopover(page, "plain");

    expect(await computed(panel, "background-color")).toBe(surface[scheme.colorScheme]);
  });

  it("follows the color-scheme the picker sets on <html>, against the system's", async () => {
    const { page } = await open("/popover", light);
    await pick(page, "scheme", "Dark");
    const panel = await openPopover(page, "plain");

    expect(await computed(panel, "background-color")).toBe(surface.dark);
  });

  it.each(schemes)(
    "reaches a portaled panel with tokens set on the part, in $colorScheme",
    async (scheme) => {
      const { page } = await open("/popover", scheme);
      const panel = await openPopover(page, "inverted");

      expect(await computed(panel, "background-color")).toBe(inverted[scheme.colorScheme]);
    },
  );

  it("recolors an open portaled panel when a --fks-* property on <html> changes", async () => {
    const { page } = await open("/popover", light);
    const panel = await openPopover(page, "plain");
    await page.evaluate(() =>
      document.documentElement.style.setProperty("--fks-color-surface", "rgb(1, 2, 3)"),
    );

    expect(await computed(panel, "background-color")).toBe("rgb(1, 2, 3)");
  });

  // The picker sits under the open panel's backdrop, so each preset is chosen before opening.
  it.each(schemes)(
    "applies a token preset from the picker to portaled panels, in $colorScheme",
    async (scheme) => {
      const { page } = await open("/popover", scheme);
      await pick(page, "tokens", "Paper");

      expect(await computed(await openPopover(page, "plain"), "background-color")).toBe(
        paper[scheme.colorScheme],
      );
    },
  );

  it("restores the theme's defaults when the picker returns to Kit", async () => {
    const { page } = await open("/popover", light);
    await pick(page, "tokens", "Paper");
    await pick(page, "tokens", "Kit");

    expect(await page.evaluate(() => document.documentElement.style.cssText)).toBe("");
    expect(await computed(await openPopover(page, "plain"), "background-color")).toBe(
      surface.light,
    );
  });

  it.each(schemes)("mixes the subtle grey in OKLab, in $colorScheme", async (scheme) => {
    const { page } = await open("/listbox", scheme);

    const items = await openPanel(
      page.locator("#language-button"),
      portaled(page).locator("#language-items"),
    );

    const polski = items.getByRole("option", { name: "Polski" });
    await polski.hover();
    await items.locator("[data-active]").waitFor();
    const fill = await computed(polski, "background-color");

    expect(await rgba(page, fill)).toEqual(subtle[scheme.colorScheme]);
  });

  // A token, or 0s where reduced motion drops movement, so an app retimes every part at once.
  it("times every transition and animation in the built CSS with a motion token", async () => {
    const { page } = await open("/", light);

    const durations = [
      ...(await declared(page, "transition-duration")),
      ...(await declared(page, "animation-duration")),
    ];

    expect(durations.length).toBeGreaterThan(0);
    expect(
      durations.filter((value) =>
        itemsOf(value).some((item) => !["0s", "var", "calc"].includes(item)),
      ),
    ).toEqual([]);
  });

  // A switch of scheme or preset would otherwise fade every resting part's colors at once. Colors
  // ease in on hover, and a list item's highlight fades out from a transparent rest, so neither
  // runs on a part at rest.
  it.each(slugs)("fades no color on /%s when the scheme switches", async (slug) => {
    const { page } = await open(`/${slug}`, light);

    const faded = await page.evaluate(() => {
      document.documentElement.style.colorScheme = "dark";
      document.documentElement.getBoundingClientRect();

      return document
        .getAnimations()
        .flatMap((animation) =>
          animation instanceof CSSTransition &&
          /color|shadow/.test(animation.transitionProperty) &&
          animation.effect instanceof KeyframeEffect
            ? [
                `${animation.transitionProperty} on ${animation.effect.target?.outerHTML.slice(0, 80) ?? ""}`,
              ]
            : [],
        );
    });

    expect(faded).toEqual([]);
  });
});

// The list as it first renders, before @foldkit/ui's next frame starts its enter transition.
const firstFrameOfList = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Readonly<Record<string, string>>>((resolve) => {
        new MutationObserver((_records, observer) => {
          const items = document.querySelector("#language-items");

          if (items === null) return;
          observer.disconnect();
          const style = getComputedStyle(items);
          resolve({
            opacity: style.opacity,
            scale: style.scale,
            transitionProperty: style.transitionProperty,
            transitionDuration: style.transitionDuration,
          });
        }).observe(document.body, { childList: true, subtree: true });
      }),
  );

// A transition takes the duration of the state it runs to: the closed state's 0.1s as a list
// leaves, the open state's 0.15s as it enters.
describe("the theme's motion", () => {
  it("opens a list from opacity 0 and scale 0.97 in 0.15s, leaving in 0.1s, and turns the chevron in 0.15s", async () => {
    const { page } = await open("/listbox", light);
    const firstFrame = firstFrameOfList(page);
    const button = page.locator("#language-button");
    await button.click();

    expect(await firstFrame).toEqual({
      opacity: "0",
      scale: "0.97",
      transitionProperty: "opacity, scale",
      transitionDuration: "0.1s",
    });
    await expect
      .poll(() => computed(portaled(page).locator("#language-items"), "transition-duration"))
      .toBe("0.15s");
    expect(await computed(button.locator("svg"), "transition-duration")).toBe("0.15s");
  });

  // A panel still fades, at the same speeds. The toolkit's motion rule finds anything that moved:
  // the panel's scale or the chevron's turn.
  it("fades a list in under reduced motion and moves nothing", async () => {
    const { page } = await open("/listbox", variationNamed("reduced-motion"));
    const firstFrame = firstFrameOfList(page);
    await openPanel(page.locator("#language-button"), portaled(page).locator("#language-items"));

    expect(await firstFrame).toMatchObject({ opacity: "0", transitionDuration: "0.1s" });
    expect(await computed(portaled(page).locator("#language-items"), "transition-duration")).toBe(
      "0.15s",
    );
    expect(await findings(page, { root: "#demo" })).toEqual([]);
  });
});

// A state a lone part shows, and how a test changes it. With no sibling in another state for the
// toolkit's state rule to compare, a screenshot before and after the change does.
type StateChange = Readonly<{
  state: string;
  path: string;
  part: (page: Page) => Locator;
  change: (page: Page) => Promise<void>;
  // CSS for the screenshots, which leaves out what the state changes besides color, such as where
  // a thumb sits.
  style?: string;
}>;

// Clicks an empty corner of the page, so that neither the pointer nor focus rests on the part.
// Forced colors draw both on a button, and Chromium keeps painting a focused button's edge in
// Highlight after it loses focus, so no part a test screenshots is ever given focus.
const leave = async (page: Page) => {
  const viewport = page.viewportSize();

  if (viewport === null) throw new Error("Open the page in a variation, which sets a viewport.");
  await page.mouse.click(viewport.width - 4, viewport.height - 4);
};

// Selects November 9 with the keyboard, from today: the grid keeps focus, so the day's button
// never takes it.
const selectDay = async (page: Page) => {
  await page.locator("#deadline-grid").focus();
  await page.keyboard.press("ArrowRight");
  await page.locator("#deadline-cell-2026-11-9[data-focused]").waitFor();
  await page.keyboard.press("Enter");
  await expect.poll(() => demo(page).locator("p").textContent()).toBe("Selected November 9, 2026.");
  await leave(page);
};

const stateChanges: ReadonlyArray<StateChange> = [
  {
    state: "a switch turned off",
    path: "/switch",
    part: (page) => demo(page).getByRole("switch", { name: "Notifications" }),
    // Through the label, which leaves focus where it was.
    change: async (page) => {
      await demo(page).getByText("Notifications", { exact: true }).click();
      await expect
        .poll(() =>
          demo(page).getByRole("switch", { name: "Notifications" }).getAttribute("aria-checked"),
        )
        .toBe("false");
      await leave(page);
    },
  },
  {
    state: "a progress bar's value",
    path: "/progress",
    part: (page) => page.locator("#upload > div"),
    change: async (page) => {
      await demo(page).getByRole("button", { name: "Advance" }).click();
      await expect.poll(() => page.locator("#upload").getAttribute("aria-valuenow")).toBe("50");
      await leave(page);
    },
  },
  {
    state: "a meter's value",
    path: "/meter",
    part: (page) => page.locator("#storage"),
    change: async (page) => {
      await demo(page).getByRole("button", { name: "Use 2 GB" }).click();
      await expect.poll(() => page.locator("#storage > div").getAttribute("data-value")).toBe("6");
      await leave(page);
    },
  },
  {
    state: "a slider's value",
    path: "/slider",
    part: (page) => page.locator("#volume-thumb").locator(".."),
    change: async (page) => {
      const thumb = page.locator("#volume-thumb");
      await thumb.press("End");
      await expect.poll(() => thumb.getAttribute("aria-valuenow")).toBe("100");
      await leave(page);
    },
    style: "#volume-thumb { visibility: hidden; }",
  },
];

// A state that sets an option, tab or day apart from its siblings, and how a test brings it about.
// The toolkit's state rule finds siblings that paint the same once forced colors replace the
// theme's own. `root` is the demo, whose controls name their portaled panels.
type SiblingState = Readonly<{
  state: string;
  path: string;
  change: (page: Page) => Promise<void>;
}>;

const siblingStates: ReadonlyArray<SiblingState> = [
  {
    state: "a selected radio option",
    path: "/radio-group",
    change: async (page) => {
      const pro = demo(page).getByRole("radio").nth(1);
      await pro.click();
      await expect.poll(() => pro.getAttribute("aria-checked")).toBe("true");
      await leave(page);
    },
  },
  { state: "a selected calendar day", path: "/calendar", change: selectDay },
  {
    state: "an active list item",
    path: "/listbox",
    change: async (page) => {
      await openPanel(page.locator("#language-button"), portaled(page).locator("#language-items"));
      await portaled(page).getByRole("option", { name: "Polski" }).hover();
      await portaled(page).locator("[data-active]").waitFor();
    },
  },
  {
    state: "a selected tab",
    path: "/tabs",
    change: async (page) => {
      const notes = page.locator("#sections-tab-1");
      await notes.click();
      await expect.poll(() => notes.getAttribute("aria-selected")).toBe("true");
      await leave(page);
    },
  },
];

// A part whose label forced colors show in HighlightText on a Highlight fill, and how a test
// brings it on screen.
type HighlightLabel = Readonly<{
  part: string;
  path: string;
  show: (page: Page) => Promise<Locator>;
}>;

const highlightLabels: ReadonlyArray<HighlightLabel> = [
  {
    part: "a primary button",
    path: "/button",
    show: async (page) => page.locator("#example-1 button"),
  },
  {
    part: "the current page's link",
    path: "/button",
    show: async (page) => page.locator('#sidebar [aria-current="page"]'),
  },
  {
    part: "a selected calendar day",
    path: "/calendar",
    show: async (page) => {
      await selectDay(page);

      return page.locator("#deadline-cell-2026-11-9 button");
    },
  },
  {
    part: "an active menu item",
    path: "/menu",
    show: async (page) => {
      const items = await openPanel(
        page.locator("#actions-button"),
        portaled(page).locator("#actions-items"),
      );

      await items.getByRole("menuitem", { name: "Rename" }).hover();

      return items.locator("[data-active]");
    },
  },
  {
    part: "an active listbox option",
    path: "/listbox",
    show: async (page) => {
      const items = await openPanel(
        page.locator("#language-button"),
        portaled(page).locator("#language-items"),
      );

      await items.getByRole("option", { name: "Polski" }).hover();

      return items.locator("[data-active]");
    },
  },
];

// How many colors a screenshot of a part's label holds, 2px in from the box of its first text:
// Chromium fills that box with a backplate under forced colors, so text drawn in the backplate's
// color leaves one. The box holds the text alone, so a mark beside it, such as an option's tick,
// adds no color.
const textColors = async (part: Locator) => {
  const page = part.page();

  const clip = await part.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, (node) =>
      node.textContent?.trim() === "" ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT,
    );

    const text = walker.nextNode();

    if (text === null) throw new Error("The part shows no text to measure.");
    const range = document.createRange();
    range.selectNodeContents(text);
    const { x, y, width, height } = range.getBoundingClientRect();

    return { x: x + 2, y: y + 2, width: width - 4, height: height - 4 };
  });

  const png = await page.screenshot({ clip, animations: "disabled" });

  return page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");

    if (context === null) throw new Error("No 2D canvas to read the screenshot with.");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);

    return new Set(
      Array.from({ length: data.length / 4 }, (_, pixel) =>
        data.slice(pixel * 4, pixel * 4 + 4).join(),
      ),
    ).size;
  }, png.toString("base64"));
};

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
describe.each([variationNamed("forced-colors-light"), variationNamed("forced-colors-dark")])(
  "the theme under forced colors, in the $colorScheme scheme",
  (scheme) => {
    // GrayText is the color Windows keeps for disabled content.
    it("leaves an enabled button's edge to the browser, not GrayText", async () => {
      const { page } = await open("/button", scheme);
      // Reset has the theme's own edge, and is enabled once the count is above 0.
      const reset = demo(page).getByRole("button", { name: "Reset" });
      await demo(page).getByRole("button", { name: "Add one" }).click();
      await expect.poll(() => reset.isEnabled()).toBe(true);
      await leave(page);

      expect(
        await computed(reset, "border-top-color"),
        "Leave edges in a color that is not a system color, so the browser draws them in its own.",
      ).not.toBe(await systemColor(page, "GrayText"));
    });

    // The browser would turn these fills into the background.
    it("draws a list separator in GrayText", async () => {
      const { page } = await open("/menu", scheme);
      await openPanel(page.locator("#actions-button"), portaled(page).locator("#actions-items"));

      expect(
        await computed(portaled(page).getByRole("separator").first(), "background-color"),
      ).toBe(await systemColor(page, "GrayText"));
    });

    // The accent and on-accent tokens are Highlight and HighlightText here, as a native checkbox's.
    it("fills a checked box in Highlight, strokes its tick in HighlightText and rings it in Highlight", async () => {
      const { page } = await open("/checkbox", scheme);
      const checkbox = demo(page).getByRole("checkbox");
      await tabInto(page);
      await page.keyboard.press(" ");
      await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("true");

      const [highlight, highlightText] = await Promise.all([
        systemColor(page, "Highlight"),
        systemColor(page, "HighlightText"),
      ]);

      expect(await computed(checkbox, "background-color")).toBe(highlight);
      expect(await computed(checkbox.locator("path"), "stroke")).toBe(highlightText);
      expect(await computed(checkbox, "outline-style")).toBe("solid");
      expect(await computed(checkbox, "outline-color")).toBe(highlight);
    });

    it("draws the empty part of a track in GrayText", async () => {
      const { page } = await open("/progress", scheme);

      expect(await computed(page.locator("#upload > div"), "background-color")).toBe(
        await systemColor(page, "GrayText"),
      );
    });

    it.each(stateChanges)("repaints $state", async ({ path, part, change, style }) => {
      const { page } = await open(path, scheme);

      const screenshot = () =>
        part(page).screenshot({ animations: "disabled", style: style ?? "" });

      const unchanged = await screenshot();
      await change(page);

      expect(
        (await screenshot()).equals(unchanged),
        "Draw the state in a token that is a system color under forced colors.",
      ).toBe(false);
    });

    it.each(highlightLabels)(
      "shows the label of $part on its Highlight fill",
      async ({ path, show }) => {
        const { page } = await open(path, scheme);

        expect(
          await textColors(await show(page)),
          "Set forced-color-adjust: none on a part that sets HighlightText on Highlight.",
        ).toBeGreaterThan(1);
      },
    );

    it.each(siblingStates)("paints $state apart from its siblings", async ({ path, change }) => {
      const { page } = await open(path, scheme);
      await change(page);

      expect(await findings(page, { root: "#demo" })).toEqual([]);
    });
  },
);

// The toolkit's focus rule checks that keyboard focus shows on every part. The theme shows it for
// keyboard focus alone: a pointer user who clicks a button sees no ring.
describe("the theme's focus ring", () => {
  it("leaves a button the pointer clicks without a ring", async () => {
    const { page } = await open("/button", light);
    const button = demo(page).getByRole("button", { name: "Add one" });
    await button.click();

    expect(await isFocused(button)).toBe(true);
    expect(await computed(button, "outline-style")).toBe("none");
  });
});
