// expect: Did you mean 'accent'?
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({ brand: { [color.acent]: "light-dark(#c2410c, #fb923c)" } });
