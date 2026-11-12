// @foldkit/ui's Fieldset with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/fieldset";
import { FieldsetStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/fieldset";

const styles = stylex.create({
  // A grid, so the fields inside are spaced without styles of their own. No frame: the legend heads
  // the group, and space sets it apart from the next.
  fieldset: {
    display: "grid",
    gap: space.md,
    minInlineSize: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    color: color.text,
  },
  // Floated, so the browser lays it out as the group's first row rather than notched into a frame;
  // the grid ignores the float itself.
  legend: {
    float: "inline-start",
    inlineSize: "100%",
    padding: 0,
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.strong,
    lineHeight: lineHeight.md,
  },
  // Under the legend as its subtitle, closer to it than the fields are.
  description: { marginBlockStart: `calc(${space.xs} - ${space.md})` },
});

// A group headed by its legend that spaces its fields. Disabled, it dims its legend and
// description only: each control inside dims through its own `isDisabled`, so nothing dims twice.
const theme = {
  fieldset: styles.fieldset,
  legend: (state) => [styles.legend, state.isDisabled && base.disabled],
  description: (state) => [
    field.description,
    styles.description,
    state.isDisabled && base.disabled,
  ],
} satisfies FieldsetStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = FieldsetStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: FieldsetStyle.Layers<List, [typeof theme]>
) => ({ view: FieldsetStyle.view(Core.view, theme, ...layers) });

/** `Fieldset.view`, styled by the theme. */
export const { view } = restyle();
