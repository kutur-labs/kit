// The README's runtime switching, as a Foldkit app writes it; `typecheck` checks it.
import type { ThemeOverrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Palette = Schema.Literals(["Zinc", "Stone"]);

type Palette = typeof Palette.Type;

// Each preset sets only the tokens it changes; Zinc keeps the defaults.
const palettes = {
  Zinc: {},
  Stone: {
    "--fks-color-surface": "light-dark(#ffffff, #1c1917)",
    "--fks-color-text": "light-dark(#1c1917, #fafaf9)",
    "--fks-color-muted": "light-dark(#57534e, #a8a29e)",
    "--fks-color-border": "light-dark(#d6d3d1, #44403c)",
    "--fks-color-control": "light-dark(#78716c, #a8a29e)",
    "--fks-color-hover": "light-dark(#f5f5f4, #292524)",
  },
} satisfies Record<Palette, ThemeOverrides>;

export const Message = defineMessageUnion({ CompletedApplyPalette: {} });

/** Sets the palette's tokens on <html>, where every token reads them, portaled panels included. */
export const ApplyPalette = Command.define("ApplyPalette", {
  args: { palette: Palette },
  messages: [Message.CompletedApplyPalette],
  execute: ({ palette }) =>
    Effect.sync(() => {
      const { style } = document.documentElement;

      // Clears the previous preset, so tokens this one leaves out return to their defaults.
      for (const name of Array.from(style)) {
        if (name.startsWith("--fks-")) {
          style.removeProperty(name);
        }
      }

      for (const [name, value] of Object.entries(palettes[palette])) {
        style.setProperty(name, value);
      }

      return Message.CompletedApplyPalette();
    }),
});
