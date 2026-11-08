import type { TextareaStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  textarea: {
    display: "block",
    minBlockSize: `calc(${size.target} * 2)`,
    paddingBlock: space.sm,
    resize: "vertical",
  },
});

/**
 * The look of a Textarea: the Input's field, two targets tall and resizable in height, filled while
 * read-only, with its edge and description in the danger color while invalid.
 */
export const textareaTheme = {
  textarea: (state) => [
    field.control,
    styles.textarea,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [field.label, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isInvalid && field.invalidDescription],
} satisfies TextareaStyle.Styles;
