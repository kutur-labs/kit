import type { CheckboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { color, motion, radius, size } from "./tokens.stylex.ts";

const styles = stylex.create({
  box: {
    position: "relative",
    display: "inline-grid",
    placeItems: "center",
    flexShrink: 0,
    inlineSize: size.box,
    blockSize: size.box,
    padding: 0,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    color: color.onAccent,
    cursor: "pointer",
  },
  checked: { borderColor: color.accent, backgroundColor: color.accent },
  label: { color: color.text, cursor: "pointer" },
});

/** The look of a Checkbox: a box with a 44px target, filled with the accent once checked. */
export const checkboxTheme = {
  checkbox: (state) => [
    styles.box,
    base.hitArea,
    base.focusRing,
    (state.isChecked || state.isIndeterminate) && styles.checked,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [
    styles.label,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  description: field.description,
} satisfies CheckboxStyle.Styles;

/**
 * The mark you render inside `checkbox`, such as "✓", or "–" while indeterminate:
 * `sx(checkboxIndicator.tick, isChecked && checkboxIndicator.ticked)`.
 */
export const checkboxIndicator = stylex.create({
  tick: {
    lineHeight: 1,
    opacity: 0,
    transitionDuration: motion.fast,
    transitionProperty: "opacity",
  },
  ticked: { opacity: 1 },
});
