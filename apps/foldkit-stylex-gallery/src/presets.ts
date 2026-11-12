import type { ThemePreset } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Preset = Schema.Literals(["Kit", "Ember", "Paper"]);

export type Preset = typeof Preset.Type;

// Kit keeps the theme's defaults. Colors are light-dark() pairs, so dark mode keeps working. Ember
// adds a hue; Paper changes surface and text, and the greys mixed from them follow. The panel radius
// is the control radius plus 0.25rem unless a preset sets it, as Paper does for square corners.
const presets = {
  Kit: {},
  Ember: {
    "--fks-color-accent": "light-dark(#b45600, #fb923c)",
    "--fks-radius-control": "2px",
  },
  Paper: {
    "--fks-color-surface": "light-dark(#fffbeb, #1c1917)",
    "--fks-color-text": "light-dark(#1c1917, #fafaf9)",
    "--fks-color-accent": "light-dark(#15803d, #6fc884)",
    "--fks-radius-control": "0px",
    "--fks-radius-panel": "0px",
  },
} satisfies Record<Preset, ThemePreset>;

export const Message = defineMessageUnion({ CompletedApplyPreset: {} });

export type Message = typeof Message.Type;

export const ApplyPreset = Command.define("ApplyPreset", {
  args: { preset: Preset },
  messages: [Message.CompletedApplyPreset],
  execute: ({ preset }) =>
    Effect.sync(() => {
      const { style } = document.documentElement;

      for (const name of Array.from(style)) {
        if (name.startsWith("--fks-")) {
          style.removeProperty(name);
        }
      }

      for (const [name, value] of Object.entries(presets[preset])) {
        style.setProperty(name, value);
      }

      return Message.CompletedApplyPreset();
    }),
});
