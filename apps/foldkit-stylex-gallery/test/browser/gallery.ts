// What every browser test shares: the gallery's pages, a browser connection per file, the
// toolkit's checks with axe-core beside them and measurements taken from computed styles. A
// component's own checks go in test/browser/<slug>.test.ts.
import { readdirSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { hairline } from "@kutur-kit/foldkit-stylex-theme/testing";
import {
  audit,
  recordMotion,
  variations,
  type AuditOptions,
  type Finding,
  type Variation,
} from "@kutur-kit/foldkit-stylex/testing";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { afterAll, beforeAll, inject } from "vitest";

/** One of the toolkit's variations, by name. */
export const variationNamed = (name: (typeof variations)[number]["name"]): Variation => {
  const found = variations.find((candidate) => candidate.name === name);

  if (found === undefined) throw new Error(`The toolkit has no variation named ${name}.`);

  return found;
};

/** The light and dark variations, in which each component's own checks run. */
export const schemes = [variationNamed("light"), variationNamed("dark")];

/** One page per demo, as src/pages.ts discovers them. */
export const slugs = readdirSync(new URL("../../src/demos/", import.meta.url))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.slice(0, -".ts".length))
  .sort();

/** A page of the gallery, hydrated, with what it logged. */
export type GalleryPage = Readonly<{
  page: Page;
  /** Console errors and uncaught exceptions since the page started loading. */
  errors: ReadonlyArray<string>;
}>;

/**
 * Connects this test file to the browser that global-setup.ts starts. `open` loads a path in a
 * fresh context built from a variation, with no state shared with another test, and records
 * motion from the start for `findings`.
 */
export const useGallery = () => {
  let browser: Browser | undefined;

  beforeAll(async () => {
    browser = await chromium.connect(inject("browserEndpoint"));
  });

  afterAll(async () => {
    await browser?.close();
  });

  const open = async (
    path: string,
    { name: _name, ...contextOptions }: Variation,
  ): Promise<GalleryPage> => {
    if (browser === undefined) throw new Error("Call open inside a test, after beforeAll ran.");

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    const errors: Array<string> = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(recordHydration);
    await page.addInitScript(recordMotion);
    const response = await page.goto(new URL(path, inject("galleryUrl")).href);

    if (response?.status() !== 200) throw new Error(`${path} answered ${response?.status()}.`);
    await page.waitForFunction(isHydrated);

    return { page, errors };
  };

  return { open };
};

/**
 * What the toolkit's `audit` and then axe-core find under `root`, once animations settle: control
 * edges, keyboard focus, targets, reflow, clipped text, motion and forced-color states, then text
 * contrast, names, roles and ARIA. axe's findings carry its rule id after `axe:`. The theme's
 * fields rest at a hairline on a fill, which `hairline` tells the edge rule.
 */
export const findings = async (
  page: Page,
  options: Required<Pick<AuditOptions, "root">> & Pick<AuditOptions, "exclude">,
): Promise<ReadonlyArray<Finding<string>>> => {
  const audited = await page.evaluate(audit, { ...options, hairline });
  const axe = new AxeBuilder({ page }).include(options.root);

  if (options.exclude !== undefined) axe.exclude(options.exclude);

  const { violations } = await axe.analyze();

  return [
    ...audited,
    ...violations.flatMap(({ id, help, nodes }) =>
      nodes.map(({ target, failureSummary }) => ({
        rule: `axe:${id}`,
        at: target.flat().join(" "),
        message: failureSummary ?? help,
      })),
    ),
  ];
};

/** How the client's first render treated the server's HTML, recorded as hydration finished. */
export type Hydration = Readonly<{
  /** The server's elements that Foldkit threw away, each the top of a detached subtree. */
  discarded: ReadonlyArray<string>;
  /** Elements of the client's first render that the server did not send. */
  created: ReadonlyArray<string>;
  /** Each attribute, class list or inline style that Foldkit changed on a server element it kept. */
  patched: ReadonlyArray<string>;
}>;

declare global {
  interface Window {
    hydration?: Hydration;
  }
}

// Runs before the page's scripts. Every element present when parsing ends came from the server's
// HTML: the client entry is a module script, which runs only after that. Foldkit removes the root's
// data-foldkit-app just before it hydrates, in the same task, and renders later updates in animation
// frames. The observer runs once that task is done, so it sees the DOM as hydration left it, before
// an update such as a VirtualList's first measurement changes it.
const recordHydration = () => {
  // What an element shows: its attributes, with class and style read through the DOM, so that
  // classes in another order or a style spelled another way compare equal. Foldkit removes its
  // data-foldkit-* markers from every element it adopts.
  const shownBy = (element: Element) =>
    new Map([
      ...Array.from(element.attributes).flatMap(({ name, value }) =>
        name.startsWith("data-foldkit-") ? [] : [[name, value] as const],
      ),
      ["class", [...element.classList].sort().join(" ")],
      [
        "style",
        element instanceof HTMLElement || element instanceof SVGElement
          ? Array.from(element.style, (name) => `${name}: ${element.style.getPropertyValue(name)}`)
              .sort()
              .join("; ")
          : "",
      ],
    ]);

  document.addEventListener("readystatechange", () => {
    if (document.readyState !== "interactive") return;

    const root = document.querySelector("[data-foldkit-app]");

    if (root === null) return;

    const sent = [root, ...root.querySelectorAll("*")];
    const isSent = new Set(sent);
    const shown = new Map(sent.map((element) => [element, shownBy(element)]));

    const listed = (elements: ReadonlyArray<Element>, isListed: (element: Element) => boolean) =>
      elements.flatMap((element) => (isListed(element) ? [element.outerHTML.slice(0, 120)] : []));

    const changes = ([element, before]: readonly [Element, ReadonlyMap<string, string>]) => {
      const after = shownBy(element);

      return [...new Set([...before.keys(), ...after.keys()])].flatMap((name) =>
        before.get(name) === after.get(name)
          ? []
          : [
              `${name}: ${JSON.stringify(before.get(name) ?? null)} → ${JSON.stringify(after.get(name) ?? null)}, on ${element.outerHTML.slice(0, 120)}`,
            ],
      );
    };

    new MutationObserver((_records, observer) => {
      observer.disconnect();
      window.hydration = {
        discarded: listed(
          sent,
          (element) => !element.isConnected && element.parentElement === null,
        ),
        created: listed([...root.querySelectorAll("*")], (element) => !isSent.has(element)),
        patched: [...shown].filter(([element]) => element.isConnected).flatMap(changes),
      };
    }).observe(root, { attributeFilter: ["data-foldkit-app"] });
  });
};

const isHydrated = () => window.hydration !== undefined;

/**
 * What hydration changed in the server's HTML. Where the server's elements and the client's first
 * render disagree, Foldkit rebuilds the nearest parent's children, or the whole root, losing focus
 * and state, and appends what the server left out. Where only their attributes disagree, such as
 * a class, it keeps the element and patches them, after the page first painted the server's.
 * What later updates change is not listed.
 */
export const hydration = (page: Page) => page.evaluate(() => window.hydration);

/** Ids that more than one element carries. */
export const duplicateIds = (page: Page) =>
  page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);

    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });

/**
 * Clicks a trigger and resolves with the panel it opens once the panel is in place: mounted, done
 * with @foldkit/ui's enter animation, and done fading in. The theme fades panels under reduced
 * motion too, and @foldkit/ui can clear `data-transition` while the fade still runs.
 */
export const openPanel = async (trigger: Locator, panel: Locator) => {
  await trigger.click();
  await panel.and(panel.page().locator(":not([data-transition])")).waitFor();
  await settled(panel);

  return panel;
};

/** Resolves once the transitions and animations running on the element a locator finds end. */
export const settled = (locator: Locator) =>
  locator.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map(({ finished }) => finished));
  });

/** Opens a Listbox or Combobox by its id, such as the header's `scheme`, with its button. */
export const openList = (page: Page, id: string) =>
  openPanel(page.locator(`#${id}-button`), page.locator(`#foldkit-portal-root #${id}-items`));

/**
 * Chooses a value in a single-select Listbox or Combobox by its id, as a user does, and resolves
 * once its list has left, so that nothing the list covered stays under its backdrop.
 */
export const pick = async (page: Page, id: string, value: string) => {
  const items = await openList(page, id);

  await items.getByRole("option", { name: value, exact: true }).click();
  await items.waitFor({ state: "detached" });
};

/**
 * Moves focus as a keyboard user does into a canvas, `#demo` unless another is named: clicking the
 * canvas's corner, inside its padding, moves where sequential focus starts, and Tab then focuses
 * the first control in it.
 */
export const tabInto = async (page: Page, canvas = "#demo") => {
  await page.locator(canvas).click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Tab");
};

/** Whether the element a locator finds has focus. */
export const isFocused = (locator: Locator) =>
  locator.evaluate((element) => element === document.activeElement);

/**
 * A color as 8-bit channels and alpha, as Chromium paints it: a canvas parses every color syntax a
 * computed style may hold, such as oklab().
 */
export const rgba = (page: Page, color: string) =>
  page.evaluate((color) => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

    if (context === null) throw new Error("No 2D canvas to read colors with.");
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;

    return [r, g, b, a / 255] as const;
  }, color);

/** WCAG 2.2's contrast ratio of two opaque colors, as `rgba` reads them. */
export const contrast = (
  first: readonly [number, number, number, number],
  second: readonly [number, number, number, number],
) => {
  const luminance = ([red, green, blue]: readonly [number, number, number, number]) => {
    const [r = 0, g = 0, b = 0] = [red, green, blue].map((channel) => {
      const value = channel / 255;

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * The contrast of a field's edge against the canvas behind it. The theme rests a field at a
 * hairline, which the audit's `hairline` option allows only because a hover turns the edge to 3:1
 * (WCAG 1.4.11).
 */
export const edgeContrast = async (field: Locator) => {
  const page = field.page();

  const [edge, canvas] = await Promise.all([
    computed(field, "border-top-color").then((color) => rgba(page, color)),
    computed(page.locator("#demo"), "background-color").then((color) => rgba(page, color)),
  ]);

  return contrast(edge, canvas);
};

/** One computed style property of the element a locator finds. */
export const computed = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate(
    (element, [property, pseudo]) =>
      getComputedStyle(element, pseudo).getPropertyValue(property ?? ""),
    [property, pseudo] as const,
  );
