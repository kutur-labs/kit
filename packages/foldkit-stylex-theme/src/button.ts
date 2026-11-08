import type { ButtonStyle } from "@kutur-kit/foldkit-stylex";

import { base } from "./internal/base.ts";

/**
 * The look of a Button: outlined, at least 44px each way, taking the hover color under the pointer.
 * @foldkit/ui leaves a disabled button enabled, so a disabled `type: "submit"` one still submits.
 */
export const buttonTheme = {
  button: (state) => [base.button, base.focusRing, state.isDisabled && base.disabled],
} satisfies ButtonStyle.Styles;
