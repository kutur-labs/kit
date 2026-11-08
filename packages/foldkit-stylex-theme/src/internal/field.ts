// Styles the form-field looks share, so that Input, Select and Textarea draw their control, label
// and description alike, and Fieldset its description.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, radius, size, space } from "../tokens.stylex.ts";

export const field = stylex.create({
  // The <input>, <select> or <textarea>: fills its container, at least size.target tall.
  control: {
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: size.target,
    margin: 0,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    lineHeight: 1.5,
    "::placeholder": { color: color.muted, opacity: 1 },
  },
  readOnly: { backgroundColor: color.hover },
  invalid: { borderColor: color.danger },
  label: { color: color.text, fontSize: fontSize.sm, fontWeight: 600 },
  description: { color: color.muted, fontSize: fontSize.sm },
  // The description usually says what is wrong, so it takes the invalid edge's color.
  invalidDescription: { color: color.danger },
});
