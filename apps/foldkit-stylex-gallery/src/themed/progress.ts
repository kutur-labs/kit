import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Button, Progress } from "@foldkit/ui";
import { ButtonStyle, ProgressStyle, sx } from "@kutur-kit/foldkit-stylex";
import { buttonTheme } from "@kutur-kit/foldkit-stylex-theme/button";
import { progressTheme } from "@kutur-kit/foldkit-stylex-theme/progress";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
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

const styles = stylex.create({
  root: { display: "grid", gap: space.md, maxInlineSize: "20rem" },
  field: { display: "grid", gap: space.sm },
  buttons: { display: "flex", gap: space.sm },
  // A token set on one part: this indicator draws in the text color where the look reads the accent.
  // The value replaces the accent's Highlight under forced colors too, so it brings its own.
  ink: {
    [color.accent]: { default: color.text, "@media (forced-colors: active)": "CanvasText" },
  },
});

const progressView = ProgressStyle.view(Progress.view, progressTheme);

const inkProgressView = ProgressStyle.view(Progress.view, progressTheme, { indicator: styles.ink });

const buttonView = ButtonStyle.view(Button.view, buttonTheme);

const field =
  (h: HtmlBuilder<Message>, text: string) =>
  ({ progress, label, track, indicator }: Progress.ProgressAttributes<Message>): Html =>
    h.div(
      [sx(styles.field)],
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
        {
          id: "themed-upload",
          value: model.uploaded,
          toView: field(h, `Upload: ${model.uploaded}%`),
        },
        h,
      ),
      h.div(
        [sx(styles.buttons)],
        [
          buttonView(
            {
              onClick: Message.ClickedAdvance(),
              toView: ({ button }) => h.button([...button], ["Advance"]),
            },
            h,
          ),
          buttonView(
            {
              onClick: Message.ClickedReset(),
              toView: ({ button }) => h.button([...button], ["Reset"]),
            },
            h,
          ),
        ],
      ),
      // Without a value, the bar is indeterminate.
      inkProgressView({ id: "themed-sync", toView: field(h, "Syncing") }, h),
    ],
  );
