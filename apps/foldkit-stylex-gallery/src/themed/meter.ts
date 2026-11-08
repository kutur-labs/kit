import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Button, Meter } from "@foldkit/ui";
import { ButtonStyle, MeterStyle, sx } from "@kutur-kit/foldkit-stylex";
import { buttonTheme } from "@kutur-kit/foldkit-stylex-theme/button";
import { meterTheme } from "@kutur-kit/foldkit-stylex-theme/meter";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
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
  root: { display: "grid", gap: space.md, maxInlineSize: "20rem" },
  field: { display: "grid", gap: space.sm },
  buttons: { display: "flex", gap: space.sm },
  // The app's own layer over the look: a thicker track. The fill follows it.
  thick: { blockSize: "1rem" },
});

const meterView = MeterStyle.view(Meter.view, meterTheme);

const thickMeterView = MeterStyle.view(Meter.view, meterTheme, { meter: styles.thick });

const buttonView = ButtonStyle.view(Button.view, buttonTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      // The best storage is empty: past `high` the look turns the fill to the danger color.
      meterView(
        {
          id: "themed-storage",
          value: model.used,
          max: capacity,
          low: 5,
          high: 8,
          optimum: 0,
          valueText: (value, max) => `${value} of ${max} GB`,
          toView: ({ meter, label, fill }) =>
            h.div(
              [sx(styles.field)],
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
          buttonView(
            {
              onClick: Message.ClickedUse(),
              toView: ({ button }) => h.button([...button], ["Use 2 GB"]),
            },
            h,
          ),
          buttonView(
            {
              onClick: Message.ClickedFree(),
              toView: ({ button }) => h.button([...button], ["Free 2 GB"]),
            },
            h,
          ),
        ],
      ),
      // The best battery is full, so a low charge is the worst region.
      thickMeterView(
        {
          id: "themed-battery",
          value: 15,
          low: 20,
          high: 80,
          optimum: 100,
          valueText: (value) => `${value}%`,
          toView: ({ meter, label, fill }) =>
            h.div(
              [sx(styles.field)],
              [h.span([...label], ["Battery: 15%"]), h.div([...meter], [h.div([...fill])])],
            ),
        },
        h,
      ),
    ],
  );
