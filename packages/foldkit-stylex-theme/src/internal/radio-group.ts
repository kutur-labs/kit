// @foldkit/ui's RadioGroup with `create` themed, plus `restyle` and `mark`.
import type { Html } from "foldkit/html";
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/radioGroup";
import { RadioGroupStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";
import { radio } from "./marks.ts";

export * from "@foldkit/ui/radioGroup";

const styles = stylex.create({
  group: { display: "flex", flexDirection: "column", gap: space.sm },
  horizontalGroup: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  // The mark in the first column, the label and the description in the second. The option is often
  // a <button>, so it drops the browser's edge and fill and sets the line height a <button> resets.
  // The rows sit in the middle of the size.target target, and the mark on the label's first line.
  option: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignContent: "center",
    alignItems: "start",
    columnGap: space.sm,
    minBlockSize: size.target,
    padding: 0,
    borderStyle: "none",
    borderRadius: radius.control,
    backgroundColor: "transparent",
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    textAlign: "start",
    cursor: "pointer",
  },
  text: { gridColumn: 2 },
  label: { fontWeight: fontWeight.medium },
});

// Plain rows, each a radio mark before its label, with the description under the label.
const theme = {
  group: (state) => [styles.group, state.orientation === "Horizontal" && styles.horizontalGroup],
  option: (state) => [
    styles.option,
    base.focusRing,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  label: [styles.text, styles.label],
  description: [styles.text, field.description],
} satisfies RadioGroupStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = RadioGroupStyle.Styles;

/**
 * `RadioGroup.Bundle`, its view named through foldkit/submodel: @foldkit/ui's own alias expands in
 * this module's declarations to Foldkit internals they cannot import (TS2883).
 */
export type Bundle<Value extends string = string> = Omit<Core.Bundle<Value>, "view"> &
  Readonly<{ view: View<Core.Model, Core.Message, Core.ViewInputs<Value>> }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: RadioGroupStyle.Layers<List, [typeof theme]>
) => ({
  create: <Value extends string = string>(): Bundle<Value> => {
    const bundle = Core.create<Value>();

    return { ...bundle, view: RadioGroupStyle.view(bundle.view, theme, ...layers) };
  },
});

/** `RadioGroup.create`, its view styled by the theme. */
export const { create } = restyle();

/** The mark you render first inside each option: a ring with a dot while `isSelected`. */
export const mark = (option: Readonly<{ isSelected: boolean }>): Html => radio(option.isSelected);
