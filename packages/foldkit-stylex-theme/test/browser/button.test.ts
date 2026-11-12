// Runs in Chromium, which matches (hover: hover): the primary button's label against its hovered
// fill, under the gallery's presets in both schemes.
import type { ThemePreset } from "../../src/tokens.stylex.ts";

import * as stylex from "@stylexjs/stylex";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Button } from "../../src/button.ts";

// The gallery's presets: Ember's light accent reaches 4.92:1 and Paper's 4.84:1, close to the
// 4.5:1 a label needs.
const presets = {
  Kit: {},
  Ember: { "--fks-color-accent": "light-dark(#b45600, #fb923c)" },
  Paper: {
    "--fks-color-surface": "light-dark(#fffbeb, #1c1917)",
    "--fks-color-text": "light-dark(#1c1917, #fafaf9)",
    "--fks-color-accent": "light-dark(#15803d, #6fc884)",
  },
} satisfies Record<string, ThemePreset>;

const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

const luminance = (color: string) => {
  if (canvas === null) throw new Error("The test reads colors through a 2D canvas.");

  canvas.clearRect(0, 0, 1, 1);
  canvas.fillStyle = color;
  canvas.fillRect(0, 0, 1, 1);

  const [red = 0, green = 0, blue = 0] = Array.from(
    canvas.getImageData(0, 0, 1, 1).data.slice(0, 3),
    (channel) => {
      const value = channel / 255;

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    },
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (a: string, b: string) => {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (lighter + 0.05) / (darker + 0.05);
};

afterEach(() => {
  document.documentElement.removeAttribute("style");
  document.body.replaceChildren();
});

describe("Button.primary", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const scheme of ["light", "dark"] as const) {
      it(`keeps its label at 4.5:1 on hover in ${name} ${scheme}`, async () => {
        const { style } = document.documentElement;
        style.colorScheme = scheme;

        for (const [property, value] of Object.entries(preset)) {
          style.setProperty(property, value);
        }

        const button = document.body.appendChild(document.createElement("button"));
        button.className = stylex.props(Button.primary.button).className ?? "";
        button.textContent = "Save";
        const rest = getComputedStyle(button).backgroundColor;

        await userEvent.hover(button);
        const { backgroundColor, color } = getComputedStyle(button);

        expect(backgroundColor).not.toBe(rest);
        expect(contrast(color, backgroundColor)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
