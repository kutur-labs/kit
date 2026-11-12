// Every page in each of the toolkit's variations, the set its README has consumers run: it loads,
// hydrates the server's HTML, logs no error, and its `main` passes the toolkit's audit and
// axe-core, closed and then with each overlay overlays.ts declares for it open. The header and
// sidebar around it are the same on every page, so they are checked on the home page alone. In
// light and dark, the same checks run again with each token preset the Tokens picker applies.
// Each test drives its own page in the shared Chromium, so a variation's tests run concurrently.
import { variations } from "@kutur-kit/foldkit-stylex/testing";
import { describe, expect, it } from "vitest";

import { Preset } from "../../src/presets.ts";
import {
  duplicateIds,
  findings,
  hydration,
  openPanel,
  pick,
  schemes,
  slugs,
  useGallery,
  variationNamed,
} from "./gallery.ts";
import { overlays, type Overlay } from "./overlays.ts";

const { open } = useGallery();

const paths = ["/", ...slugs.map((slug) => `/${slug}`)];

const content = { root: "main" } as const;

const shell = { root: "body", exclude: "main" } as const;

// Kit is the theme's defaults, which every variation already checks.
const presets = Preset.literals.filter((preset) => preset !== "Kit");

describe.concurrent.each(variations)("in the $name variation", (variation) => {
  it.for(paths)("hydrates %s cleanly and passes the checks", async (path, { expect }) => {
    const { page, errors } = await open(path, variation);

    expect(await hydration(page)).toEqual({ discarded: [], created: [], patched: [] });
    expect(await duplicateIds(page)).toEqual([]);
    expect(errors).toEqual([]);
    expect(await findings(page, content)).toEqual([]);
  });

  const opened = Object.entries(overlays).flatMap(([path, list]) =>
    list.flatMap((overlay: Overlay) =>
      (overlay.isOfferedIn?.(variation) ?? true) ? [{ path, name: overlay.name, overlay }] : [],
    ),
  );

  // What opened is counted again after the audit, which fails the test if it closed before.
  it.for(opened)(
    "passes the checks on $path with $name open",
    async ({ path, overlay }, { expect }) => {
      const { page, errors } = await open(path, variation);
      const shown = await overlay.open(page);
      const count = await shown.count();

      expect(await findings(page, { root: overlay.root })).toEqual([]);
      expect(await shown.count()).toBe(count);
      expect(errors).toEqual([]);
    },
  );

  it("passes the checks in the header and sidebar", async ({ expect }) => {
    const { page } = await open("/", variation);

    expect(await findings(page, shell)).toEqual([]);
  });
});

describe.concurrent.each(schemes)(
  "with each token preset, in the $colorScheme scheme",
  (scheme) => {
    it.for(paths)("passes the checks on %s", async (path, { expect }) => {
      const { page } = await open(path, scheme);

      for (const preset of presets) {
        await pick(page, "tokens", preset);
        expect(await findings(page, content), preset).toEqual([]);
      }
    });

    it("passes the checks in the header and sidebar", async ({ expect }) => {
      const { page } = await open("/", scheme);

      for (const preset of presets) {
        await pick(page, "tokens", preset);
        expect(await findings(page, shell), preset).toEqual([]);
      }
    });
  },
);

it("declares overlays only for pages the gallery has", () => {
  expect(Object.keys(overlays).filter((path) => !paths.includes(path))).toEqual([]);
});

// A phone's 320px, 400% zoom of 1280px (WCAG 1.4.10), under a mouse and under a finger, whose
// 44px targets widen the calendar: the toolkit's reflow rule finds anything that scrolls the page
// sideways, and the panel must also fit the screen's height.
describe.each([variationNamed("narrow"), variationNamed("touch")])(
  "in the $name variation",
  (phone) => {
    it("keeps the open date picker inside the viewport", async () => {
      const { page } = await open("/date-picker", phone);

      const panel = await openPanel(
        page.locator("#due-popover-button"),
        page.locator("#foldkit-portal-root #due-popover-panel"),
      );

      const box = await panel.boundingBox();

      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(phone.viewport.width);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(phone.viewport.height);
      expect(await findings(page, content)).toEqual([]);
    });
  },
);
