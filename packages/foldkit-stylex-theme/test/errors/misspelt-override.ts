// expect: '"--fks-color-acent"' does not exist in type 'ThemeOverrides'.
import type { ThemeOverrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

export const overrides = stylex.defineVars({
  "--fks-color-acent": "light-dark(#c2410c, #fb923c)",
} satisfies ThemeOverrides);
