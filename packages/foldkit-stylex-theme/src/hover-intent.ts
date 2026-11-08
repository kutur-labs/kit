import type { HoverIntentStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // Visibility switches at the end of the fade out, so the hidden panel takes no hover or focus.
  panel: { padding: space.md, transitionProperty: "opacity, scale, visibility" },
  hidden: { visibility: "hidden" },
});

/**
 * The look of HoverIntent: an outlined trigger and a raised panel that fades in and out. Keep the
 * panel rendered while hidden so it can fade; place it yourself, as HoverIntent positions nothing.
 */
export const hoverIntentTheme = {
  trigger: (state) => [base.button, base.focusRing, state.isVisible && base.pressed],
  panel: (state) => [
    base.panel,
    base.transition,
    styles.panel,
    !state.isVisible && [base.closed, styles.hidden],
  ],
} satisfies HoverIntentStyle.Styles;
