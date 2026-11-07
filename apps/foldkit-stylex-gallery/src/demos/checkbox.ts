import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  box: {
    display: "grid",
    placeItems: "center",
    inlineSize: 24,
    blockSize: 24,
    padding: 0,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
  },
  checked: { backgroundColor: "currentColor" },
  disabled: { opacity: 0.5 },
  tick: { opacity: 0, color: "Canvas" },
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

/** A checkbox whose tick shows while checked. */
export const terms = <Message>(
  isChecked: boolean,
  onToggle: (isChecked: boolean) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  checkboxView(
    {
      id: "terms",
      isChecked,
      onToggle,
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
