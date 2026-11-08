import type { TooltipStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { fontSize, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  panel: {
    maxInlineSize: "min(16rem, 100vw - 2rem)",
    paddingBlock: space.xs,
    paddingInline: space.sm,
    fontSize: fontSize.sm,
    lineHeight: 1.4,
  },
});

/**
 * The look of a Tooltip: an outlined trigger and a small raised panel. A tooltip has no leave
 * animation, so the panel shows and hides at once.
 */
export const tooltipTheme = {
  trigger: (state) => [
    base.button,
    base.focusRing,
    state.isVisible && base.pressed,
    state.isDisabled && base.disabled,
  ],
  panel: [base.panel, styles.panel],
} satisfies TooltipStyle.Styles;
