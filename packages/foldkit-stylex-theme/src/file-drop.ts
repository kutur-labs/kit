import type { FileDropStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, radius, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // Positioned and centring its items, so the visually hidden input sits in the middle of the
  // zone and a 44px target around it stays inside.
  root: {
    position: "relative",
    display: "grid",
    alignContent: "center",
    alignItems: "center",
    justifyItems: "center",
    gap: space.xs,
    minBlockSize: "8rem",
    padding: space.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.control,
    borderRadius: radius.panel,
    backgroundColor: { default: color.surface, ":hover": color.hover },
    color: color.text,
    textAlign: "center",
    cursor: "pointer",
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color",
    transitionTimingFunction: motion.easing,
  },
  // The input inside takes focus, so the zone draws the ring for it. ':focus-within' would also
  // ring the zone after a click.
  focusRing: {
    outlineColor: color.focus,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":has(:focus-visible)": "solid" },
    outlineWidth: 2,
  },
  dragOver: { borderStyle: "solid", borderColor: color.accent, backgroundColor: color.hover },
});

/**
 * The look of a FileDrop: a dashed zone that turns solid in the accent while files are dragged over
 * it, with a focus ring while its hidden input has keyboard focus.
 */
export const fileDropTheme = {
  root: (state) => [
    styles.root,
    styles.focusRing,
    state.isDragOver && styles.dragOver,
    state.isDisabled && base.disabled,
  ],
} satisfies FileDropStyle.Styles;

/**
 * The text you render inside `root`: `sx(fileDropText.title)` for the call to action and
 * `sx(fileDropText.hint)` for the accepted files.
 */
export const fileDropText = stylex.create({
  title: { margin: 0, fontSize: fontSize.md, fontWeight: 600 },
  hint: { margin: 0, color: color.muted, fontSize: fontSize.sm },
});
