// @foldkit/ui's Select with `view` themed, plus `restyle` and `field`.
import type { Html } from "foldkit/html";

import * as Core from "@foldkit/ui/select";
import { SelectStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { fontWeight, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field as fieldStyles } from "./field.ts";
import { selectField } from "./marks.ts";

export * from "@foldkit/ui/select";

const styles = stylex.create({
  // Without the browser's arrow, which no style reaches; the end padding leaves room for the
  // chevron space.sm from the end, and as much again before the text.
  select: {
    appearance: "none",
    paddingInlineEnd: `calc(${space.sm} * 2 + ${size.mark})`,
    // The chosen value, in the weight of a Listbox trigger's.
    fontWeight: fontWeight.medium,
    cursor: "pointer",
  },
});

// The Input's field with a chevron in place of the browser's arrow.
const theme = {
  select: (state) => [
    fieldStyles.control,
    base.hoverEase,
    styles.select,
    base.focusRing,
    state.isInvalid && fieldStyles.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [fieldStyles.label, state.isDisabled && base.disabled],
  description: (state) => [
    fieldStyles.description,
    state.isInvalid && fieldStyles.invalidDescription,
  ],
} satisfies SelectStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = SelectStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: SelectStyle.Layers<List, [typeof theme]>
) => ({ view: SelectStyle.view(Core.view, theme, ...layers) });

/** `Select.view`, styled by the theme. */
export const { view } = restyle();

/** The `<select>` you render, with the chevron the theme draws in place of the browser's arrow. */
export const field = (
  select: Html,
  state: Readonly<{ isDisabled?: boolean | undefined }> = {},
): Html => selectField(select, state.isDisabled === true);
