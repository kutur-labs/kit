// @foldkit/ui's HoverIntent with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/hoverIntent";
import { HoverIntentStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/hoverIntent";

const styles = stylex.create({
  // Visibility switches at the end of the fade out, so the hidden panel takes no hover or focus.
  panel: { padding: space.md, transitionProperty: "opacity, scale, visibility" },
  hidden: { visibility: "hidden" },
});

// An outlined trigger and a raised panel that fades in and out. Keep the panel rendered while
// hidden so it can fade; place it yourself, as HoverIntent positions nothing.
const theme = {
  trigger: [base.button, base.focusRing],
  panel: (state) => [
    base.panel,
    base.transition,
    styles.panel,
    !state.isVisible && [base.closed, styles.hidden],
  ],
} satisfies HoverIntentStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = HoverIntentStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: HoverIntentStyle.Layers<List, [typeof theme]>
) => ({ view: HoverIntentStyle.view(Core.view, theme, ...layers) });

/** `HoverIntent.view`, styled by the theme. */
export const { view } = restyle();
