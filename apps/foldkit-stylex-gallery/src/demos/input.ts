import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Input } from "@foldkit/ui";
import { InputStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ email: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ChangedEmail: { value: Schema.String } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { email: "" } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedEmail: ({ value }) => ({ model: { email: value } }),
  });

const styles = stylex.create({
  field: { display: "grid", gap: 4, maxInlineSize: 320 },
  input: {
    paddingBlock: 8,
    paddingInline: 8,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
  },
  invalid: { borderColor: "crimson" },
  description: { margin: 0, fontSize: 14 },
  invalidDescription: { color: "crimson" },
});

const inputView = InputStyle.view(Input.view, {
  input: (state) => [styles.input, state.isInvalid && styles.invalid],
  description: (state) => [styles.description, state.isInvalid && styles.invalidDescription],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isInvalid = model.email !== "" && !model.email.includes("@");

  return inputView(
    {
      id: "email",
      type: "email",
      value: model.email,
      placeholder: "you@example.com",
      isInvalid,
      hasDescription: true,
      onInput: (value) => Message.ChangedEmail({ value }),
      toView: ({ input, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Email"]),
            h.input([...input]),
            h.p(
              [...description],
              [isInvalid ? "An email address has an @ in it." : "We write once a month."],
            ),
          ],
        ),
    },
    h,
  );
};
