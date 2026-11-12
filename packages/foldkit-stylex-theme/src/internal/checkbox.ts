// @foldkit/ui's Checkbox with `view` themed, plus `restyle` and `mark`.
import type { Html } from "foldkit/html";

import * as Core from "@foldkit/ui/checkbox";
import { CheckboxStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";
import { dash, tick } from "./marks.ts";

export * from "@foldkit/ui/checkbox";

const styles = stylex.create({
  box: {
    position: "relative",
    display: "inline-grid",
    placeItems: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    inlineSize: size.mark,
    blockSize: size.mark,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.control,
    // Rounder than 0.25rem, a 1rem box reads as a radio.
    borderRadius: `min(${radius.control}, 0.25rem)`,
    backgroundColor: color.surface,
    color: color.onAccent,
    cursor: "pointer",
  },
  // The label's font, after base.lineMark's, so the box centres on the label's first line whatever
  // font the row inherits.
  line: { fontSize: fontSize.md, lineHeight: lineHeight.md },
  checked: { borderColor: color.accent, backgroundColor: color.accent },
  label: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    cursor: "pointer",
  },
  // The mark fills the box inside its edge.
  mark: { inlineSize: "100%", blockSize: "100%" },
});

// A box with a size.target target, filled with the accent once checked or indeterminate.
const theme = {
  checkbox: (state) => [
    styles.box,
    base.lineMark,
    styles.line,
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

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = CheckboxStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: CheckboxStyle.Layers<List, [typeof theme]>
) => ({ view: CheckboxStyle.view(Core.view, theme, ...layers) });

/** `Checkbox.view`, styled by the theme. */
export const { view } = restyle();

/** The mark inside `checkbox`: a dash while indeterminate, else a tick that draws in once checked. */
export const mark = (
  state: Readonly<{ isChecked: boolean; isIndeterminate?: boolean | undefined }>,
): Html =>
  state.isIndeterminate === true ? dash(styles.mark) : tick(state.isChecked, styles.mark);
