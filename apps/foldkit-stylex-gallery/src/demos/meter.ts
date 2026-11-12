import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { Meter } from "@kutur-kit/foldkit-stylex-theme/meter";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Shows a value within a known range, such as storage in use.";

export const Model = Schema.Struct({ used: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedUse: {}, ClickedFree: {} });

export type Message = typeof Message.Type;

const capacity = 10;

const battery = 15;

export const init = (): Update.Return<Model, Message> => ({ model: { used: 4 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedUse: () => ({ model: { used: Math.min(capacity, model.used + 2) } }),
    ClickedFree: () => ({ model: { used: Math.max(0, model.used - 2) } }),
  });

const styles = stylex.create({
  root: { display: "grid", gap: space.lg, inlineSize: "100%", maxInlineSize: "20rem" },
  field: { display: "grid", gap: space.sm },
  value: { color: color.muted },
  buttons: { display: "flex", gap: space.sm },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      // The best storage is empty: past `high` the look turns the fill to the danger color.
      Meter.view(
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
              [sx(styles.field)],
              [
                // The meter announces the value, so the label's copy of it is hidden from the name.
                h.span(
                  [...label],
                  [
                    "Storage",
                    h.span(
                      [h.AriaHidden(true), sx(styles.value)],
                      [`${model.used} of ${capacity} GB used`],
                    ),
                  ],
                ),
                h.div([...meter], [h.div([...fill])]),
              ],
            ),
        },
        h,
      ),
      // The best battery is full, so a low charge is the worst region.
      Meter.view(
        {
          id: "battery",
          value: battery,
          low: 20,
          high: 80,
          optimum: 100,
          valueText: (value) => `${value}%`,
          toView: ({ meter, label, fill }) =>
            h.div(
              [sx(styles.field)],
              [
                h.span(
                  [...label],
                  ["Battery", h.span([h.AriaHidden(true), sx(styles.value)], [`${battery}%`])],
                ),
                h.div([...meter], [h.div([...fill])]),
              ],
            ),
        },
        h,
      ),
      h.div(
        [sx(styles.buttons)],
        [
          Button.view(
            {
              onClick: Message.ClickedUse(),
              toView: ({ button }) => h.button([...button], ["Use 2 GB"]),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedFree(),
              toView: ({ button }) => h.button([...button], ["Free 2 GB"]),
            },
            h,
          ),
        ],
      ),
    ],
  );
