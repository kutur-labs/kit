import type { Html, HtmlBuilder } from "foldkit/html";

import { Progress } from "@foldkit/ui";
import { ProgressStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

// Progress's config produces no Message, so the styled view takes any app's builder.
export const upload = <Message>(percent: number, h: HtmlBuilder<Message>): Html =>
  progressView(
    {
      id: "upload",
      value: percent,
      toView: ({ progress, label, track, indicator }) =>
        h.div(
          [],
          [
            h.span([...label], ["Upload"]),
            h.div([...progress], [h.div([...track], [h.div([...indicator], [])])]),
          ],
        ),
    },
    h,
  );

const sweep = stylex.keyframes({
  from: { translate: "-100% 0" },
  to: { translate: "300% 0" },
});

const styles = stylex.create({
  track: { blockSize: 8, borderRadius: 4, backgroundColor: "gainsboro", overflow: "hidden" },
  indicator: { blockSize: "100%", backgroundColor: "black" },
  // @foldkit/ui sets no width while indeterminate.
  sweeping: {
    minInlineSize: "30%",
    animationName: sweep,
    animationDuration: "1.2s",
    animationIterationCount: "infinite",
  },
  complete: { backgroundColor: "seagreen" },
});

const progressView = ProgressStyle.view(Progress.view, {
  track: styles.track,
  indicator: (state) => [
    styles.indicator,
    state.isIndeterminate && styles.sweeping,
    state.isComplete && styles.complete,
  ],
});
