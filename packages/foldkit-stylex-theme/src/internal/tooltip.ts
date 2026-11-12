// @foldkit/ui's Tooltip with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/tooltip";
import { TooltipStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { fontSize, lineHeight, radius, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/tooltip";

const styles = stylex.create({
  // A control's radius: radius.panel suits a panel around rounded items, and would round one line
  // of text into a pill.
  panel: {
    maxInlineSize: "min(16rem, 100vw - 2rem)",
    borderRadius: radius.control,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
});

// A trigger and a small raised panel. A tooltip has no leave animation, so the panel
// shows and hides at once.
const theme = {
  trigger: (state) => [base.button, base.focusRing, state.isDisabled && base.disabledButton],
  panel: [base.panel, styles.panel],
} satisfies TooltipStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = TooltipStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: TooltipStyle.Layers<List, [typeof theme]>
) => ({ view: TooltipStyle.view(Core.view, theme, ...layers) });

/** `Tooltip.view`, styled by the theme. */
export const { view } = restyle();
