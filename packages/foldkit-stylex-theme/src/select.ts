import type { SelectStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { color, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // Without the native arrow; the end padding leaves room for the chevron the app draws.
  select: {
    appearance: "none",
    paddingInlineEnd: `calc(${space.sm} * 2 + 1em)`,
    cursor: "pointer",
  },
});

/**
 * The look of a Select: the Input's field without the browser's arrow, with its edge and
 * description in the danger color while invalid. Draw the arrow with `selectChevron`.
 */
export const selectTheme = {
  select: (state) => [
    field.control,
    styles.select,
    base.focusRing,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [field.label, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isInvalid && field.invalidDescription],
} satisfies SelectStyle.Styles;

/**
 * The arrow you draw after the `<select>`, such as "▾", with an element around both:
 * `sx(selectChevron.field)` on that element and
 * `sx(selectChevron.chevron, isDisabled && selectChevron.disabled)` on the arrow. Clicks pass
 * through the arrow to the select.
 */
export const selectChevron = stylex.create({
  field: { position: "relative" },
  chevron: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineEnd: space.sm,
    translate: "0 -50%",
    color: color.muted,
    lineHeight: 1,
    pointerEvents: "none",
  },
  disabled: { opacity: 0.5 },
});
