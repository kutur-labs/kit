import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Meter } from "@foldkit/ui";
import { MeterStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ used: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedUse: {}, ClickedFree: {} });

export type Message = typeof Message.Type;

const capacity = 10;

export const init = (): Update.Return<Model, Message> => ({ model: { used: 4 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedUse: () => ({ model: { used: Math.min(capacity, model.used + 2) } }),
    ClickedFree: () => ({ model: { used: Math.max(0, model.used - 2) } }),
  });

const styles = stylex.create({
  root: { display: "grid", gap: 8, maxInlineSize: 320 },
  buttons: { display: "flex", gap: 8 },
  button: { minBlockSize: 44, paddingInline: 16, font: "inherit" },
  meter: { blockSize: 8, borderRadius: 4, backgroundColor: "gainsboro", overflow: "hidden" },
  fill: { blockSize: "100%", backgroundColor: "seagreen" },
  high: { backgroundColor: "firebrick" },
});

// @foldkit/ui works out no region from the thresholds, so the styles compare the value with them.
const meterView = MeterStyle.view(Meter.view, {
  meter: styles.meter,
  fill: (state) => [styles.fill, state.value > (state.high ?? Infinity) && styles.high],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      meterView(
        {
          id: "storage",
          value: model.used,
          max: capacity,
          low: 5,
          high: 8,
          optimum: 0,
          valueText: (value, max) => `${value} of ${max} GB`,
          toView: ({ meter, label, fill }) =>
            h.div(
              [sx(styles.root)],
              [
                h.span([...label], [`Storage: ${model.used} of ${capacity} GB used`]),
                h.div([...meter], [h.div([...fill])]),
              ],
            ),
        },
        h,
      ),
      h.div(
        [sx(styles.buttons)],
        [
          h.button(
            [h.Type("button"), h.OnClick(Message.ClickedUse()), sx(styles.button)],
            ["Use 2 GB"],
          ),
          h.button(
            [h.Type("button"), h.OnClick(Message.ClickedFree()), sx(styles.button)],
            ["Free 2 GB"],
          ),
        ],
      ),
    ],
  );
