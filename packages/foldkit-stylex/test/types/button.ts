import type { Html, HtmlBuilder } from "foldkit/html";

import { Button } from "@foldkit/ui";
import { ButtonStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onClick alone would reject the builder.
const Message = defineMessageUnion({ ClickedSave: {}, ClickedCancel: {} });

type Message = typeof Message.Type;

export const save = (isSaving: boolean, h: HtmlBuilder<Message>): Html =>
  buttonView(
    {
      onClick: Message.ClickedSave(),
      isDisabled: isSaving,
      type: "submit",
      toView: ({ button }) => h.button([...button], ["Save"]),
    },
    h,
  );

const styles = stylex.create({
  button: {
    minBlockSize: 44,
    paddingInline: 16,
    backgroundColor: { default: "black", ":hover": "dimgray" },
    color: "white",
    outline: { default: "none", ":focus-visible": "2px solid royalblue" },
  },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
});

const buttonView = ButtonStyle.view(Button.view, {
  button: (state) => [styles.button, state.isDisabled && styles.disabled],
});
