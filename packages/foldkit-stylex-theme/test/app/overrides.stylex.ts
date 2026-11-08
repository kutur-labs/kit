// An app's token overrides, as the README's customising table writes them.
import type { ThemeOverrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

export const overrides = stylex.defineVars({
  "--fks-color-accent": "light-dark(#c2410c, #fb923c)",
  "--fks-radius-control": "0",
} satisfies ThemeOverrides);
