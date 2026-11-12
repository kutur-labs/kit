// @foldkit/ui's Textarea with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/textarea";
import { TextareaStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/textarea";

const styles = stylex.create({
  textarea: { display: "block", resize: "vertical" },
});

// The Input's field, as many lines tall as its `rows` and resizable in height.
const theme = {
  textarea: (state) => [
    field.control,
    base.hoverEase,
    styles.textarea,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [field.label, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isInvalid && field.invalidDescription],
} satisfies TextareaStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = TextareaStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: TextareaStyle.Layers<List, [typeof theme]>
) => ({ view: TextareaStyle.view(Core.view, theme, ...layers) });

/** `Textarea.view`, styled by the theme. */
export const { view } = restyle();
