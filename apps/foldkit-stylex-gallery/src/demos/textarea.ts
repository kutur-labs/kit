import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Textarea } from "@foldkit/ui";
import { TextareaStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

const maxLength = 140;

export const Model = Schema.Struct({ bio: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ChangedBio: { value: Schema.String } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { bio: "" } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedBio: ({ value }) => ({ model: { bio: value } }),
  });

const styles = stylex.create({
  field: { display: "grid", gap: 4, maxInlineSize: 320 },
  textarea: {
    padding: 8,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
    resize: "vertical",
  },
  invalid: { borderColor: "crimson" },
  description: { margin: 0, fontSize: 14 },
  invalidDescription: { color: "crimson" },
});

const textareaView = TextareaStyle.view(Textarea.view, {
  textarea: (state) => [styles.textarea, state.isInvalid && styles.invalid],
  description: (state) => [styles.description, state.isInvalid && styles.invalidDescription],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  textareaView(
    {
      id: "bio",
      value: model.bio,
      rows: 4,
      isInvalid: model.bio.length > maxLength,
      hasDescription: true,
      onInput: (value) => Message.ChangedBio({ value }),
      toView: ({ textarea, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Bio"]),
            h.textarea([...textarea]),
            h.p([...description], [`${model.bio.length} of ${maxLength} characters`]),
          ],
        ),
    },
    h,
  );
