// @foldkit/ui's Progress with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/progress";
import { ProgressStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { motion } from "../tokens.stylex.ts";
import { bar } from "./bar.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/progress";

// From wholly before the track's inline start to wholly past its end, for an indicator 40% of its
// width. A margin rather than translate, so it runs the other way in a right-to-left page.
const sweep = stylex.keyframes({
  from: { marginInlineStart: "-40%" },
  to: { marginInlineStart: "100%" },
});

// Under reduced motion the indicator fills the track and fades instead: a still segment would read
// as a value.
const pulse = stylex.keyframes({
  from: { opacity: 1 },
  "50%": { opacity: 0.4 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  // Linear, as updates often stream in and each would restart an ease-out.
  indicator: { transitionTimingFunction: "linear" },
  // @foldkit/ui sets no width while indeterminate.
  indeterminate: {
    minInlineSize: { default: "40%", "@media (prefers-reduced-motion: reduce)": "100%" },
    animationName: { default: sweep, "@media (prefers-reduced-motion: reduce)": pulse },
    animationDuration: `calc(${motion.slow} * 10)`,
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },
});

// A thin round track filled with the accent, and a segment sweeping across it while indeterminate.
const theme = {
  label: [field.label, field.value, field.valueLabel],
  track: [bar.track, base.borderFill],
  indicator: (state) => [bar.fill, styles.indicator, state.isIndeterminate && styles.indeterminate],
} satisfies ProgressStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = ProgressStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: ProgressStyle.Layers<List, [typeof theme]>
) => ({ view: ProgressStyle.view(Core.view, theme, ...layers) });

/** `Progress.view`, styled by the theme. Render `track` inside `progress` and `indicator` inside `track`. */
export const { view } = restyle();
