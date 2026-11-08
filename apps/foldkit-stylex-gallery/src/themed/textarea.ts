import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Textarea } from "@foldkit/ui";
import { TextareaStyle, sx } from "@kutur-kit/foldkit-stylex";
import { textareaTheme } from "@kutur-kit/foldkit-stylex-theme/textarea";
import { fontSize } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

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
  field: { display: "grid", gap: 4, maxInlineSize: 420 },
  description: { margin: 0 },
  // Layered over the look: these properties win, the look's edge, focus ring and states stay.
  verse: { fontFamily: "Georgia, serif", fontSize: fontSize.lg, lineHeight: 1.75 },
});

const textareaView = TextareaStyle.view(Textarea.view, textareaTheme, {
  textarea: styles.verse,
  description: styles.description,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  textareaView(
    {
      id: "themed-poem",
      value: model.poem,
      rows: 6,
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
