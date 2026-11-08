import type { Html, HtmlBuilder } from "foldkit/html";

import { Textarea } from "@foldkit/ui";
import { TextareaStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onInput alone would reject the builder.
const Message = defineMessageUnion({ ChangedBio: { value: Schema.String }, ClickedSave: {} });

type Message = typeof Message.Type;

export const bio = (value: string, h: HtmlBuilder<Message>): Html =>
  textareaView(
    {
      id: "bio",
      value,
      rows: 4,
      onInput: (next) => Message.ChangedBio({ value: next }),
      toView: ({ textarea, label }) =>
        h.div(
          [],
          [
            h.label([...label], ["Bio"]),
            // h.textarea takes no InnerHTML, so this compiles only while the wrapped view hands
            // toView a TextareaAttribute bundle rather than a wider Attribute one.
            h.textarea([...textarea]),
            h.button([h.OnClick(Message.ClickedSave())], ["Save"]),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  textarea: { minBlockSize: 96, padding: 12, resize: "vertical" },
  invalid: { borderColor: "crimson" },
});

const textareaView = TextareaStyle.view(Textarea.view, {
  textarea: (state) => [styles.textarea, state.isInvalid && styles.invalid],
});
