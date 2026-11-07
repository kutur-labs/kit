import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";

export const terms = (isChecked: boolean, h: HtmlBuilder<Message>): Html =>
  checkboxView(
    {
      id: "terms",
      isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...checkbox], [h.span([sx(styles.tick, isChecked && styles.ticked)], ["✓"])]),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  box: {
    inlineSize: 24,
    blockSize: 24,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
  },
  checked: { backgroundColor: { default: "black", ":hover": "dimgray" } },
  disabled: { opacity: 0.5 },
  tick: { opacity: 0 },
  ticked: { opacity: 1 },
  label: { minBlockSize: 44, display: "flex", alignItems: "center" },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, {
  checkbox: (state) => [
    styles.box,
    state.isChecked && styles.checked,
    state.isDisabled && styles.disabled,
  ],
  label: styles.label,
});
