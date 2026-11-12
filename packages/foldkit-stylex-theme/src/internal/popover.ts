// @foldkit/ui's Popover with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/popover";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/popover";

const styles = stylex.create({
  panel: { maxInlineSize: "min(20rem, 100vw - 2rem)", padding: space.md },
  // A square turned to a diamond, centred on the panel's edge. Its top and left sides, which the
  // turn makes the two that point at the trigger, carry the panel's edge; the half inside the panel
  // covers the panel's ring between them. The sides take color.border, as near as a token comes to the
  // ring's faint line. Physical sides, as the turn is physical. `transform` applies after the
  // `rotate` that points the arrow.
  arrow: {
    boxSizing: "border-box",
    inlineSize: "0.75rem",
    blockSize: "0.75rem",
    borderColor: color.border,
    borderStyle: "solid",
    borderWidth: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    backgroundColor: color.surface,
    transform: "rotate(45deg)",
  },
});

// A trigger and a raised panel that grows from it.
const theme = {
  button: (state) => [base.button, base.focusRing, state.isDisabled && base.disabledButton],
  panel: (state) => [base.panel, base.transition, styles.panel, state.isClosed && base.closed],
  arrow: styles.arrow,
} satisfies PopoverStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = PopoverStyle.Styles;

/** `Popover.ViewInputs` whose `toView` gets the styled `RenderInfo`. */
export type ViewInputs = PopoverStyle.ViewInputs;

/** `Popover.RenderInfo` with each part styled, plus `wrapper` for the trigger's parent element. */
export type RenderInfo = PopoverStyle.RenderInfo;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: PopoverStyle.Layers<List, [typeof theme]>
) => ({ view: PopoverStyle.view(Core.view, theme, ...layers) });

/** `Popover.view`, styled by the theme. */
export const { view } = restyle();
