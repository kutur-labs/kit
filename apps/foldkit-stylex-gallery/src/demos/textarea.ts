import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Textarea } from "@kutur-kit/foldkit-stylex-theme/textarea";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "A multi-line text field.";

const maxLength = 280;

export const Model = Schema.Struct({ poem: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ChangedPoem: { value: Schema.String } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { poem: "" } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedPoem: ({ value }) => ({ model: { poem: value } }),
  });

const styles = stylex.create({
  field: { display: "grid", gap: space.sm, inlineSize: "100%", maxInlineSize: "24rem" },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Textarea.view(
    {
      id: "poem",
      value: model.poem,
      rows: 4,
      placeholder: "Write a few lines",
      isInvalid: model.poem.length > maxLength,
      hasDescription: true,
      onInput: (value) => Message.ChangedPoem({ value }),
      toView: ({ textarea, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Poem"]),
            h.textarea([...textarea]),
            h.p([...description], [`${model.poem.length} of ${maxLength} characters`]),
          ],
        ),
    },
    h,
  );
