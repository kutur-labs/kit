// expect: "An earlier styles object sets paddingBlock, paddingInline and paddingInlineEnd on this part, which StyleX applies over padding whatever the order. Set paddingBlock, paddingInline and paddingInlineEnd in this styles object too."
import { Listbox } from "@kutur-kit/foldkit-stylex-theme/listbox";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ flat: { padding: 0 } });

// The theme is the earlier styles object: it sets the button's paddingBlock, paddingInline and
// paddingInlineEnd.
export const Flat = Listbox.restyle({ button: styles.flat });
