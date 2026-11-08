import type { SwitchStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { color, motion, size } from "./tokens.stylex.ts";

const styles = stylex.create({
  // A content box two thumbs wide, so `switchThumb.on` moves the thumb by one thumb, toward the
  // inline end in either direction.
  track: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    boxSizing: "content-box",
    inlineSize: `calc(2 * ${size.thumb})`,
    blockSize: size.thumb,
    padding: 2,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: 9999,
    backgroundColor: color.surface,
    cursor: "pointer",
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color",
  },
  checked: { borderColor: color.accent, backgroundColor: color.accent },
  // The label toggles the switch too.
  label: { color: color.text, cursor: "pointer", userSelect: "none" },
});

/** The look of a Switch: a rounded track with a 44px target, filled with the accent once on. */
export const switchTheme = {
  button: (state) => [
    styles.track,
    base.hitArea,
    base.focusRing,
    state.isChecked && styles.checked,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [
    styles.label,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  description: field.description,
} satisfies SwitchStyle.Styles;

/**
 * The thumb you render inside `button`, which slides across once on:
 * `sx(switchThumb.thumb, isChecked && switchThumb.on)`.
 */
export const switchThumb = stylex.create({
  thumb: {
    display: "block",
    inlineSize: size.thumb,
    blockSize: size.thumb,
    borderRadius: 9999,
    backgroundColor: color.control,
    transitionDuration: motion.fast,
    transitionProperty: "margin-inline-start, background-color",
    transitionTimingFunction: motion.easing,
  },
  on: { marginInlineStart: size.thumb, backgroundColor: color.onAccent },
});
