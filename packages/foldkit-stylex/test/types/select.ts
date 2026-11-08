import type { Html, HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import { SelectStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onChange alone would reject the builder.
const Message = defineMessageUnion({ ChoseLanguage: { value: Schema.String }, ClickedReset: {} });

type Message = typeof Message.Type;

export const language = (value: string, h: HtmlBuilder<Message>): Html =>
  selectView(
    {
      id: "language",
      value,
      onChange: (next) => Message.ChoseLanguage({ value: next }),
      toView: ({ select, label }) =>
        h.div(
          [],
          [
            h.label([...label], ["Language"]),
            h.select(
              [...select],
              [h.option([h.Value("pl")], ["Polski"]), h.option([h.Value("en")], ["English"])],
            ),
            h.button([h.OnClick(Message.ClickedReset())], ["Reset"]),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  select: { minBlockSize: 44, paddingInline: 12 },
  invalid: { borderColor: "crimson" },
  disabled: { opacity: 0.5 },
});

const selectView = SelectStyle.view(Select.view, {
  select: (state) => [
    styles.select,
    state.isInvalid && styles.invalid,
    state.isDisabled && styles.disabled,
  ],
});
