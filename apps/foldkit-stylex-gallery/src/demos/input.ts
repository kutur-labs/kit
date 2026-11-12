import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Input } from "@kutur-kit/foldkit-stylex-theme/input";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "A single-line text field with its label and description.";

export const Model = Schema.Struct({ email: Schema.String, search: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ChangedEmail: { value: Schema.String },
  ChangedSearch: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { email: "", search: "" } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedEmail: ({ value }) => ({ model: { ...model, email: value } }),
    ChangedSearch: ({ value }) => ({ model: { ...model, search: value } }),
  });

const styles = stylex.create({
  form: { display: "grid", gap: space.lg, inlineSize: "100%", maxInlineSize: "20rem" },
  field: { display: "grid", gap: space.sm },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isInvalid = model.email !== "" && !model.email.includes("@");

  return h.div(
    [sx(styles.form)],
    [
      Input.view(
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
      ),
      Input.view(
        {
          id: "handle",
          value: "reader",
          isReadOnly: true,
          hasDescription: true,
          toView: ({ input, label, description }) =>
            h.div(
              [sx(styles.field)],
              [
                h.label([...label], ["Handle"]),
                h.input([...input]),
                h.p([...description], ["Chosen when you joined."]),
              ],
            ),
        },
        h,
      ),
      Input.view(
        {
          id: "search",
          type: "search",
          value: model.search,
          placeholder: "Poems, notes, people",
          onInput: (value) => Message.ChangedSearch({ value }),
          toView: ({ input, label }) =>
            h.div([sx(styles.field)], [h.label([...label], ["Search"]), h.input([...input])]),
        },
        h,
      ),
    ],
  );
};
