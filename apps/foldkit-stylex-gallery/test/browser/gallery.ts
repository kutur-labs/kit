// What every browser test shares: the gallery's pages, a browser connection per file and the
// measurements taken from computed styles. A component's own checks go in test/browser/<slug>.test.ts.
import { readdirSync } from "node:fs";

import {
  chromium,
  type Browser,
  type BrowserContextOptions,
  type Locator,
  type Page,
} from "playwright";
import { afterAll, beforeAll, inject } from "vitest";

import { installWcag } from "./wcag.ts";

/** The color schemes every page is checked in, as the operating system reports them. */
export const schemes = ["light", "dark"] as const;

export type Scheme = (typeof schemes)[number];

const slugsIn = (directory: string) =>
  readdirSync(new URL(`../../src/${directory}/`, import.meta.url))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.slice(0, -".ts".length))
    .sort();

/** One page per core demo, as src/pages.ts discovers them. */
export const slugs = slugsIn("demos");

/** The pages that also show a themed demo. */
export const themedSlugs = slugsIn("themed");

/** A page of the gallery, hydrated, with what it logged. */
export type GalleryPage = Readonly<{
  page: Page;
  /** Console errors and uncaught exceptions since the page started loading. */
  errors: ReadonlyArray<string>;
}>;

/**
 * Connects this test file to the browser that global-setup.ts starts. `open` loads a path in a
 * fresh context: the given scheme, reduced motion so transitions end at once unless a test turns
 * it off, forced colors (Windows High Contrast) only if asked, and no state shared with another
 * test.
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
    scheme: Scheme,
    {
      forcedColors = "none",
      reducedMotion = "reduce",
    }: Pick<BrowserContextOptions, "forcedColors" | "reducedMotion"> = {},
  ): Promise<GalleryPage> => {
    if (browser === undefined) throw new Error("Call open inside a test, after beforeAll ran.");

    const context = await browser.newContext({
      colorScheme: scheme,
      forcedColors,
      reducedMotion,
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    const errors: Array<string> = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(recordHydration);
    await page.addInitScript(installWcag);
    const response = await page.goto(new URL(path, inject("galleryUrl")).href);

    if (response?.status() !== 200) throw new Error(`${path} answered ${response?.status()}.`);
    await page.waitForFunction(isHydrated);

    return { page, errors };
  };

  return { open };
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
 * Clicks a trigger and resolves with the panel it opens once the panel is in place: mounted, and
 * done with @foldkit/ui's enter animation, whose first frame is scaled or faded by the looks.
 */
export const openPanel = async (trigger: Locator, panel: Locator) => {
  await trigger.click();
  await panel.and(panel.page().locator(":not([data-transition])")).waitFor();

  return panel;
};

/**
 * Moves focus as a keyboard user does into the page's core or themed demo: clicking its heading
 * moves where sequential focus starts, and Tab then focuses the demo's first control.
 */
export const tabInto = async (page: Page, demo: "core" | "themed") => {
  await page.locator(`#${demo}-demo h2`).click();
  await page.keyboard.press("Tab");
};

/** Whether the element a locator finds has focus. */
export const isFocused = (locator: Locator) =>
  locator.evaluate((element) => element === document.activeElement);

/** One computed style property of the element a locator finds. */
export const computed = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate(
    (element, [property, pseudo]) =>
      getComputedStyle(element, pseudo).getPropertyValue(property ?? ""),
    [property, pseudo] as const,
  );
