// Runs in Chromium: tokenContrast reads the theme's compiled CSS and measures colors as the browser
// computes them. Loading tokens.stylex.ts inserts the tokens' :root rule.
import * as stylex from "@stylexjs/stylex";
import { afterEach, assert, describe, expect, it } from "vitest";

import { tokenContrast } from "../../src/testing.ts";
import { color } from "../../src/tokens.stylex.ts";

const inverse = "light-dark(#18181b, #ffffff)";

const ink = "light-dark(#ffffff, #18181b)";

const styles = stylex.create({
  // A part that sets its surface close to the default and leaves the greys to the page.
  ownSurface: { [color.surface]: "light-dark(#fafafa, #1c1c1f)" },
  // A part that swaps surface and text and sets the greys, but leaves accent and onAccent to the
  // page.
  inverted: {
    [color.surface]: inverse,
    [color.text]: ink,
    [color.subtle]: `color-mix(in oklab, ${ink} 5%, ${inverse})`,
    [color.border]: `color-mix(in oklab, ${ink} 10%, ${inverse})`,
    [color.control]: `color-mix(in oklab, ${ink} 50%, ${inverse})`,
    [color.muted]: `color-mix(in oklab, ${ink} 62%, ${inverse})`,
    [color.danger]: "light-dark(#f87171, #b91c1c)",
  },
});

const partWith = (className: string | undefined) => {
  const part = document.body.appendChild(document.createElement("div"));
  part.id = "panel";
  part.className = className ?? "";

  return part;
};

afterEach(() => {
  document.documentElement.removeAttribute("style");
  document.body.replaceChildren();
});

describe("tokenContrast", () => {
  it("passes the theme's defaults", () => {
    expect(tokenContrast()).toEqual([]);
  });

  it("reports the one pair a preset breaks, with the scheme and the value to change", () => {
    expect(
      tokenContrast({ preset: { "--fks-color-muted": "light-dark(#666668, #7e7e80)" } }),
    ).toEqual([
      {
        rule: "contrast",
        at: "color.muted on color.subtle",
        message:
          "color.muted on color.subtle: 4.28:1 in dark (#7e7e80 on #1a1a1c). Secondary text needs 4.5:1 (WCAG 1.4.3). The page sets --fks-color-muted to light-dark(#666668, #7e7e80). Change --fks-color-muted.",
      },
    ]);
  });

  it("explains a failing default by what it mixes and what the page sets", () => {
    expect(
      tokenContrast({ preset: { "--fks-color-text": "light-dark(#18181b, #ccccd0)" } }),
    ).toEqual([
      {
        rule: "contrast",
        at: "color.muted on color.subtle",
        message:
          "color.muted on color.subtle: 4.37:1 in dark (#7e7e81 on #18181b). Secondary text needs 4.5:1 (WCAG 1.4.3). muted is color-mix(in oklab, text 62%, surface), and the page sets --fks-color-text to light-dark(#18181b, #ccccd0). Move text and surface apart, or set --fks-color-muted.",
      },
    ]);
  });

  it("reports a part that sets its surface but keeps the page's greys", () => {
    const part = partWith(stylex.props(styles.ownSurface).className);

    expect(tokenContrast({ part: "#panel" })).toEqual([
      {
        rule: "derived",
        at: "#panel",
        message:
          "#panel sets color.surface but keeps the page's color.subtle, color.border, color.control, color.muted, color.accent, color.onAccent: they resolved at :root, from the page's surface and text unless it sets them, so they may not match the part or reach their contrast (WCAG 1.4.3). Set them on the part too.",
      },
    ]);
    expect(part.childElementCount).toBe(0);
  });

  it("measures a translucent foreground over its background", () => {
    const muted = "light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.1))";
    const advice = `Secondary text needs 4.5:1 (WCAG 1.4.3). The page sets --fks-color-muted to ${muted}. Change --fks-color-muted.`;

    expect(tokenContrast({ preset: { "--fks-color-muted": muted } })).toEqual([
      {
        rule: "contrast",
        at: "color.muted on color.surface",
        message: `color.muted on color.surface: 1.25:1 in light (#e5e5e5 on #ffffff). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.muted on color.surface",
        message: `color.muted on color.surface: 1.30:1 in dark (#29292b on #111113). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.muted on color.subtle",
        message: `color.muted on color.subtle: 1.25:1 in light (#d9d9d9 on #f2f2f2). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.muted on color.subtle",
        message: `color.muted on color.subtle: 1.34:1 in dark (#313133 on #1a1a1c). ${advice}`,
      },
    ]);
  });

  // The page's Canvas shows through: text keeps its contrast, and onAccent, which defaults to the
  // surface, shows the accent under it.
  it("measures a transparent surface over the page's Canvas", () => {
    const advice =
      "Text and marks on the accent need 4.5:1 (WCAG 1.4.3). onAccent is surface, and the page sets --fks-color-surface to transparent. Move surface apart, or set --fks-color-on-accent.";

    expect(tokenContrast({ preset: { "--fks-color-surface": "transparent" } })).toEqual([
      {
        rule: "contrast",
        at: "color.onAccent on color.accent",
        message: `color.onAccent on color.accent: 1.00:1 in light (#18181b on #18181b). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.onAccent on color.accent",
        message: `color.onAccent on color.accent: 1.00:1 in dark (#ededed on #ededed). ${advice}`,
      },
    ]);
  });

  it("reports a value that is no color instead of measuring it", () => {
    expect(tokenContrast({ preset: { "--fks-color-muted": "notacolor" } })).toEqual([
      {
        rule: "contrast",
        at: "color.muted",
        message:
          "color.muted is not a color, so its pairs cannot be measured: the page sets --fks-color-muted to notacolor. Change --fks-color-muted to a color.",
      },
    ]);
  });

  // The greys mix text, so they are no color either, and only text is reported.
  it("reports only the value that is no color, not the tokens that mix it", () => {
    expect(tokenContrast({ preset: { "--fks-color-text": "notacolor" } })).toEqual([
      {
        rule: "contrast",
        at: "color.text",
        message:
          "color.text is not a color, so its pairs cannot be measured: the page sets --fks-color-text to notacolor. Change --fks-color-text to a color.",
      },
    ]);
  });

  // accent and onAccent default to text and surface as :root resolves them, and a --fks-* property
  // set on the part would not reach them, so the advice names the token on the part.
  it("reports a part that swaps surface and text but keeps the page's accent", () => {
    partWith(stylex.props(styles.inverted).className);

    const advice =
      "Checked and selected controls and the focus ring need 3:1 (WCAG 1.4.11). accent is text, and #panel sets text. Move text apart, or set color.accent on #panel.";

    expect(tokenContrast({ part: "#panel" })).toEqual([
      {
        rule: "derived",
        at: "#panel",
        message:
          "#panel sets color.surface and color.text but keeps the page's color.accent, color.onAccent: they resolved at :root, from the page's surface and text unless it sets them, so they may not match the part or reach their contrast (WCAG 1.4.3). Set them on the part too.",
      },
      {
        rule: "contrast",
        at: "color.accent on color.surface",
        message: `color.accent on color.surface: 1.00:1 in light (#18181b on #18181b). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.accent on color.surface",
        message: `color.accent on color.surface: 1.17:1 in dark (#ededed on #ffffff). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.accent on color.subtle",
        message: `color.accent on color.subtle: 1.10:1 in light (#18181b on #212124). ${advice}`,
      },
      {
        rule: "contrast",
        at: "color.accent on color.subtle",
        message: `color.accent on color.subtle: 1.04:1 in dark (#ededed on #f2f2f2). ${advice}`,
      },
    ]);
  });

  it("measures the preset in place of the page's values and restores <html>'s style", () => {
    const style = "--fks-color-muted: light-dark(#666668, #7e7e80); scroll-padding-top: 1px;";
    document.documentElement.setAttribute("style", style);

    expect(tokenContrast({ preset: {} })).toEqual([]);
    expect(document.documentElement.getAttribute("style")).toBe(style);
  });

  it("throws when the part matches nothing", () => {
    expect(() => tokenContrast({ part: "#missing" })).toThrow(
      'No element matches the part "#missing".',
    );
  });

  // Playwright's page.evaluate sends the function's source, so this runs that source in a page that
  // loads no stylesheet.
  it("throws from its source alone in a page without the theme's tokens", async () => {
    const frame = document.createElement("iframe");
    frame.srcdoc = "<!doctype html><title>Blank</title>";

    const loaded = new Promise((resolve) =>
      frame.addEventListener("load", resolve, { once: true }),
    );

    document.body.append(frame);
    await loaded;

    const blank = frame.contentDocument;
    assert(blank !== null, "The blank page is cross-origin.");
    const script = blank.createElement("script");
    script.textContent = `try { (${tokenContrast.toString()})(); } catch (error) { document.body.dataset.error = error.message; }`;
    blank.body.append(script);

    expect(blank.body.dataset["error"]).toBe(
      "No stylesheet in this page defines the theme's color tokens. Load a themed component first, and serve its CSS from the page's origin: a cross-origin sheet hides its rules.",
    );
  });
});
