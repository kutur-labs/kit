import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Button } from "@foldkit/ui";
import { ButtonStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ count: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedAdd: {}, ClickedReset: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { count: 0 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAdd: () => ({ model: { count: model.count + 1 } }),
    ClickedReset: () => ({ model: { count: 0 } }),
  });

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  button: {
    minBlockSize: 44,
    paddingInline: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "currentColor",
    borderRadius: 4,
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in srgb, currentColor 10%, transparent)",
    },
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
});

const buttonView = ButtonStyle.view(Button.view, {
  button: (state) => [styles.button, state.isDisabled && styles.disabled],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      buttonView(
        {
          onClick: Message.ClickedAdd(),
          toView: ({ button }) => h.button([...button], ["Add one"]),
        },
        h,
      ),
      buttonView(
        {
          onClick: Message.ClickedReset(),
          isDisabled: model.count === 0,
          toView: ({ button }) => h.button([...button], ["Reset"]),
        },
        h,
      ),
      h.output([], [`Count: ${model.count}`]),
    ],
  );
