import type { RadioGroupStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, radius, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  group: { display: "flex", flexDirection: "column", gap: space.sm },
  horizontalGroup: { flexDirection: "row", flexWrap: "wrap" },
  // A card: the mark in the first column, the label and the description in the second.
  option: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignItems: "center",
    columnGap: space.sm,
    rowGap: space.xs,
    minBlockSize: size.target,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: radius.control,
    backgroundColor: { default: color.surface, ":hover": color.hover },
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    textAlign: "start",
    cursor: "pointer",
  },
  // Doubles the edge without moving the content.
  selected: { borderColor: color.accent, boxShadow: `inset 0 0 0 1px ${color.accent}` },
  readOnly: { cursor: "default" },
  text: { gridColumn: 2 },
  description: { color: color.muted, fontSize: fontSize.sm },
});

/**
 * The look of a RadioGroup: each option a bordered card, outlined with the accent once selected.
 * Render `radioGroupMark` first inside each option, then its label and description.
 */
export const radioGroupTheme = {
  group: (state) => [styles.group, state.orientation === "Horizontal" && styles.horizontalGroup],
  option: (state) => [
    styles.option,
    base.focusRing,
    state.isSelected && styles.selected,
    state.isReadOnly && styles.readOnly,
    state.isDisabled && base.disabled,
  ],
  label: styles.text,
  description: [styles.text, styles.description],
} satisfies RadioGroupStyle.Styles;

/**
 * The radio mark you render first inside each option, a ring that fills with a dot once selected:
 * `sx(radioGroupMark.mark, option.isSelected && radioGroupMark.marked)`.
 */
export const radioGroupMark = stylex.create({
  mark: {
    boxSizing: "border-box",
    inlineSize: size.box,
    blockSize: size.box,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: 9999,
    backgroundColor: color.surface,
    transitionDuration: motion.fast,
    transitionProperty: "border-color, background-color",
  },
  // The surface-colored inset leaves a ring between the edge and the dot.
  marked: {
    borderColor: color.accent,
    backgroundColor: color.accent,
    boxShadow: `inset 0 0 0 0.1875rem ${color.surface}`,
  },
});
