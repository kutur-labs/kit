import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Progress } from "@foldkit/ui";
import { ProgressStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ uploaded: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedAdvance: {}, ClickedReset: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { uploaded: 25 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAdvance: () => ({ model: { uploaded: Math.min(100, model.uploaded + 25) } }),
    ClickedReset: () => ({ model: { uploaded: 0 } }),
  });

const sweep = stylex.keyframes({
  from: { translate: "-100% 0" },
  to: { translate: "300% 0" },
});

const styles = stylex.create({
  root: { display: "grid", gap: 8, maxInlineSize: 320 },
  buttons: { display: "flex", gap: 8 },
  button: { minBlockSize: 44, paddingInline: 16, font: "inherit" },
  track: { blockSize: 8, borderRadius: 4, backgroundColor: "gainsboro", overflow: "hidden" },
  indicator: { blockSize: "100%", backgroundColor: "black" },
  // @foldkit/ui sets no width while indeterminate, so the styles give it one.
  sweeping: {
    minInlineSize: "25%",
    animationName: sweep,
    animationDuration: { default: "1.2s", "@media (prefers-reduced-motion: reduce)": "0s" },
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

const field =
  (h: HtmlBuilder<Message>, text: string) =>
  ({ progress, label, track, indicator }: Progress.ProgressAttributes<Message>): Html =>
    h.div(
      [sx(styles.root)],
      [
        h.span([...label], [text]),
        h.div([...progress], [h.div([...track], [h.div([...indicator])])]),
      ],
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      progressView(
        { id: "upload", value: model.uploaded, toView: field(h, `Upload: ${model.uploaded}%`) },
        h,
      ),
      h.div(
        [sx(styles.buttons)],
        [
          h.button(
            [h.Type("button"), h.OnClick(Message.ClickedAdvance()), sx(styles.button)],
            ["Advance"],
          ),
          h.button(
            [h.Type("button"), h.OnClick(Message.ClickedReset()), sx(styles.button)],
            ["Reset"],
          ),
        ],
      ),
      // Without a value, the bar is indeterminate.
      progressView({ id: "sync", toView: field(h, "Syncing") }, h),
    ],
  );
