import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { Progress } from "@kutur-kit/foldkit-stylex-theme/progress";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Shows how far a task has come, or that it is still running.";

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

const styles = stylex.create({
  root: { display: "grid", gap: space.lg, inlineSize: "100%", maxInlineSize: "20rem" },
  field: { display: "grid", gap: space.sm },
  value: { color: color.muted },
  buttons: { display: "flex", gap: space.sm },
});

const field =
  (h: HtmlBuilder<Message>, text: string, value: string) =>
  ({ progress, label, track, indicator }: Progress.ProgressAttributes<Message>): Html =>
    h.div(
      [sx(styles.field)],
      [
        // The bar announces the value, so the label's copy of it is hidden from the name.
        h.span([...label], [text, h.span([h.AriaHidden(true), sx(styles.value)], [value])]),
        h.div([...progress], [h.div([...track], [h.div([...indicator])])]),
      ],
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      Progress.view(
        {
          id: "upload",
          value: model.uploaded,
          toView: field(h, "Uploading poems.zip", `${model.uploaded}%`),
        },
        h,
      ),
      // Without a value, the bar is indeterminate.
      Progress.view({ id: "sync", toView: field(h, "Syncing library", "Checking for changes") }, h),
      h.div(
        [sx(styles.buttons)],
        [
          Button.view(
            {
              onClick: Message.ClickedAdvance(),
              toView: ({ button }) => h.button([...button], ["Advance"]),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedReset(),
              toView: ({ button }) => h.button([...button], ["Reset"]),
            },
            h,
          ),
        ],
      ),
    ],
  );
