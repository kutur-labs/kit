import type { Html, HtmlBuilder } from "foldkit/html";

import { Meter } from "@foldkit/ui";
import { MeterStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

// Meter's config produces no Message, so the styled view takes any app's builder.
export const storage = <Message>(used: number, h: HtmlBuilder<Message>): Html =>
  meterView(
    {
      id: "storage",
      value: used,
      max: 10,
      low: 3,
      high: 8,
      optimum: 0,
      toView: ({ meter, label, fill }) =>
        h.div([], [h.span([...label], ["Storage"]), h.div([...meter], [h.div([...fill], [])])]),
    },
    h,
  );

const styles = stylex.create({
  meter: { blockSize: 8, borderRadius: 4, backgroundColor: "gainsboro", overflow: "hidden" },
  fill: { blockSize: "100%", backgroundColor: "seagreen" },
  high: { backgroundColor: "firebrick" },
});

// The thresholds are numbers or undefined, so the app compares them with the value.
const meterView = MeterStyle.view(Meter.view, {
  meter: styles.meter,
  fill: (state) => [styles.fill, state.value >= (state.high ?? Infinity) && styles.high],
});
