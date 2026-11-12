// @foldkit/ui's Meter with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/meter";
import { MeterStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color } from "../tokens.stylex.ts";
import { bar } from "./bar.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/meter";

const styles = stylex.create({ worst: { backgroundColor: color.danger } });

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

// A thin round track filled with the accent, or with the danger color while the value is past the
// threshold farthest from `optimum`, as a browser's <meter> turns red.
const theme = {
  meter: [bar.track, base.borderFill],
  label: [field.label, field.value, field.valueLabel],
  fill: (state) => [bar.fill, isWorst(state) && styles.worst],
} satisfies MeterStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = MeterStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: MeterStyle.Layers<List, [typeof theme]>
) => ({ view: MeterStyle.view(Core.view, theme, ...layers) });

/** `Meter.view`, styled by the theme. */
export const { view } = restyle();
