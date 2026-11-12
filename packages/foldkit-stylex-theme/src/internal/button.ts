// @foldkit/ui's Button with `view` themed, plus `restyle` and the `primary` and `quiet` layers.
import * as Core from "@foldkit/ui/button";
import { ButtonStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/button";

const styles = stylex.create({
  // The hover moves the fill's lightness away from the surface, which onAccent defaults to, so the
  // label keeps the contrast tokenContrast checks on the accent: a mix toward the surface took a
  // 4.9:1 accent below 4.5:1. The scheme gives the direction, so a part that inverts its surface
  // without its color-scheme loses contrast on hover. It changes the fill rather than fading the
  // button, because an opacity here would replace base.disabledButton's. The fill shows through a
  // transparent edge, so the hover changes it to the rim. Under forced colors base.systemColors
  // keeps that edge transparent, and the Highlight fill bounds the button.
  primary: {
    borderColor: "transparent",
    backgroundColor: {
      default: color.accent,
      ":hover": {
        default: null,
        "@media (hover: hover)": `light-dark(oklch(from ${color.accent} calc(l - 0.06) c h), oklch(from ${color.accent} calc(l + 0.06) c h))`,
      },
    },
    color: color.onAccent,
  },
  // base.quietButton mutes its label for the icons in the theme's own close and dismiss buttons.
  // An action keeps the text color, so it does not read as disabled beside an outlined button.
  quiet: { color: color.text },
});

// A hairline on the subtle fill, size.control tall, its edge at 3:1 under the pointer.
const theme = {
  button: (state) => [base.button, base.focusRing, state.isDisabled && base.disabledButton],
} satisfies ButtonStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = ButtonStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: ButtonStyle.Layers<List, [typeof theme]>
) => ({ view: ButtonStyle.view(Core.view, theme, ...layers) });

/** `Button.view`, styled by the theme. */
export const { view } = restyle();

/** A layer for the main action: filled with the accent, as `Button.restyle(Button.primary)`. */
export const primary = { button: [styles.primary, base.systemColors] } satisfies Styles;

/** A layer for a button drawn as its label alone, filled only under the pointer. */
export const quiet = { button: [base.quietButton, styles.quiet] } satisfies Styles;
