import type { Html, HtmlBuilder } from "foldkit/html";

import { Input } from "@foldkit/ui";
import { InputStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onInput alone would reject the builder.
const Message = defineMessageUnion({ ChangedName: { value: Schema.String }, ClickedClear: {} });

type Message = typeof Message.Type;

export const name = (value: string, isInvalid: boolean, h: HtmlBuilder<Message>): Html =>
  inputView(
    {
      id: "name",
      value,
      isInvalid,
      hasDescription: isInvalid,
      onInput: (next) => Message.ChangedName({ value: next }),
      toView: ({ input, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Name"]),
            h.input([...input]),
            h.button([h.OnClick(Message.ClickedClear())], ["Clear"]),
            ...(isInvalid ? [h.p([...description], ["Enter your name."])] : []),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  field: { display: "grid", gap: 4 },
  input: {
    minBlockSize: 44,
    paddingInline: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "gray",
    outline: { default: "none", ":focus-visible": "2px solid royalblue" },
  },
  readOnly: { backgroundColor: "whitesmoke" },
  invalid: { borderColor: "crimson" },
  disabled: { opacity: 0.5 },
  error: { color: "crimson" },
});

const inputView = InputStyle.view(Input.view, {
  input: (state) => [
    styles.input,
    state.isReadOnly && styles.readOnly,
    state.isInvalid && styles.invalid,
    state.isDisabled && styles.disabled,
  ],
  description: (state) => state.isInvalid && styles.error,
});
