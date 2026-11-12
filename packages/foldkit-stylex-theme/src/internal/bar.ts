// The track and fill Meter and Progress share: a thin round track, filled with the accent.
import * as stylex from "@stylexjs/stylex";

import { color, motion, radius, size } from "../tokens.stylex.ts";

export const bar = stylex.create({
  // Three eighths of a mark thick, so it follows a preset that resizes the marks.
  track: {
    display: "flex",
    inlineSize: "100%",
    blockSize: `calc(${size.mark} * 0.375)`,
    overflow: "hidden",
    borderRadius: radius.control,
  },
  // A value moves at motion.slow, and snaps under reduced motion.
  fill: {
    borderRadius: radius.control,
    backgroundColor: color.accent,
    transitionDuration: { default: motion.slow, "@media (prefers-reduced-motion: reduce)": "0s" },
    transitionProperty: "width",
    transitionTimingFunction: motion.easing,
  },
});
