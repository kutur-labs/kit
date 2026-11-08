import type { InputStyle } from "@kutur-kit/foldkit-stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";

/**
 * The look of an Input: a full-width field with a control-colored edge, filled while read-only,
 * with its edge and description in the danger color while invalid.
 */
export const inputTheme = {
  input: (state) => [
    field.control,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [field.label, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isInvalid && field.invalidDescription],
} satisfies InputStyle.Styles;
