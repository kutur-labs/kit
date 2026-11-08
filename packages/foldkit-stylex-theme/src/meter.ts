import type { MeterStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { color, fontSize, motion } from "./tokens.stylex.ts";

const styles = stylex.create({
  label: { color: color.text, fontSize: fontSize.sm },
  meter: {
    display: "flex",
    inlineSize: "100%",
    blockSize: "0.5rem",
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: color.border,
  },
  fill: {
    borderRadius: 9999,
    backgroundColor: color.accent,
    transitionDuration: motion.slow,
    transitionProperty: "width, background-color",
    transitionTimingFunction: motion.easing,
  },
  worst: { backgroundColor: color.danger },
});

// HTML's <meter> rule, with its defaults for thresholds the config leaves out: the value is at its
// worst when it lies past the threshold on the far side from `optimum`.
const isWorst = ({
  value,
  min,
  max,
  low = min,
  high = max,
  optimum = (min + max) / 2,
}: MeterStyle.State) => (optimum < low && value > high) || (optimum > high && value < low);

/**
 * The look of a Meter: a thin rounded track filled with the accent, or with the danger color while
 * the value is past the threshold farthest from `optimum`, as a browser's `<meter>` turns red.
 */
export const meterTheme = {
  meter: styles.meter,
  label: styles.label,
  fill: (state) => [styles.fill, isWorst(state) && styles.worst],
} satisfies MeterStyle.Styles;
