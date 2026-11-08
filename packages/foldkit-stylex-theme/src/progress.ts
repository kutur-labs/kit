import type { ProgressStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { color, fontSize, motion } from "./tokens.stylex.ts";

// From wholly before the track's start to wholly past its end, for an indicator 40% of its width.
const sweep = stylex.keyframes({
  from: { translate: "-100% 0" },
  to: { translate: "250% 0" },
});

const styles = stylex.create({
  label: { color: color.text, fontSize: fontSize.sm },
  track: {
    display: "flex",
    inlineSize: "100%",
    blockSize: "0.5rem",
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: color.border,
  },
  indicator: {
    borderRadius: 9999,
    backgroundColor: color.accent,
    transitionDuration: motion.slow,
    transitionProperty: "width",
    transitionTimingFunction: motion.easing,
  },
  // @foldkit/ui sets no width while indeterminate. Under reduced motion the duration is 0s, and the
  // indicator stays still at the start of the track.
  indeterminate: {
    minInlineSize: "40%",
    animationName: sweep,
    animationDuration: `calc(${motion.slow} * 6)`,
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },
});

/**
 * The look of Progress: a thin rounded track filled with the accent, and a segment sweeping across
 * it while indeterminate. Render `track` inside `progress` and `indicator` inside `track`.
 */
export const progressTheme = {
  label: styles.label,
  track: styles.track,
  indicator: (state) => [styles.indicator, state.isIndeterminate && styles.indeterminate],
} satisfies ProgressStyle.Styles;
