import type { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  panel: { maxInlineSize: "min(20rem, 100vw - 2rem)", padding: space.md },
  arrow: {
    inlineSize: size.arrow,
    blockSize: size.arrow,
    backgroundColor: color.surface,
    clipPath: "polygon(50% 0, 100% 50%, 0 50%)",
  },
});

/** The look of a Popover: an outlined trigger and a raised panel that fades in. */
export const popoverTheme = {
  button: (state) => [
    base.button,
    base.focusRing,
    state.isVisible && base.pressed,
    state.isDisabled && base.disabled,
  ],
  panel: (state) => [base.panel, base.transition, styles.panel, state.isClosed && base.closed],
  arrow: styles.arrow,
} satisfies PopoverStyle.Styles;
