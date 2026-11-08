import type { DisclosureStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, motion, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  button: { justifyContent: "space-between", inlineSize: "100%", textAlign: "start" },
  // Flat, because `animatePanel` clips it to its box. The padding keeps the focus rings of links
  // and buttons inside the panel clear of that clip.
  panel: { paddingBlock: space.sm, paddingInline: space.md, color: color.text },
});

/**
 * The look of a Disclosure: a full-width outlined button over a flat panel, which `animatePanel`
 * may wrap.
 */
export const disclosureTheme = {
  button: (state) => [
    base.button,
    base.focusRing,
    styles.button,
    state.isOpen && base.pressed,
    state.isDisabled && base.disabled,
  ],
  panel: styles.panel,
} satisfies DisclosureStyle.Styles;

/**
 * The chevron you render inside `button`, which turns over once open:
 * `sx(disclosureChevron.chevron, isOpen && disclosureChevron.open)`.
 */
export const disclosureChevron = stylex.create({
  chevron: {
    color: color.muted,
    lineHeight: 1,
    transitionDuration: motion.fast,
    transitionProperty: "rotate",
    transitionTimingFunction: motion.easing,
  },
  open: { rotate: "180deg" },
});
