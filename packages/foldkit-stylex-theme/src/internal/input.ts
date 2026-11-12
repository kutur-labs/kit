// @foldkit/ui's Input with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/input";
import { InputStyle } from "@kutur-kit/foldkit-stylex";

import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/input";

// A full-width field, filled while read-only, with its edge and description in the danger color
// while invalid.
const theme = {
  input: (state) => [
    field.control,
    base.hoverEase,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [field.label, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isInvalid && field.invalidDescription],
} satisfies InputStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = InputStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: InputStyle.Layers<List, [typeof theme]>
) => ({ view: InputStyle.view(Core.view, theme, ...layers) });

/** `Input.view`, styled by the theme. */
export const { view } = restyle();
