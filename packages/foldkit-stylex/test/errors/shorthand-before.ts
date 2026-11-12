// expect: "An earlier styles object sets paddingInline on this part, which StyleX applies over padding whatever the order. Set paddingInline in this styles object too."
import { Button } from "@foldkit/ui";
import { ButtonStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

// A library's own styles, which its `restyle` puts before the app's: the app's layer is checked
// against them although they are not in its list.
const theme = { button: s.inline } satisfies ButtonStyle.Styles;

const restyle = <const List extends ReadonlyArray<ButtonStyle.Styles>>(
  ...layers: ButtonStyle.Layers<List, [typeof theme]>
) => ButtonStyle.view(Button.view, theme, ...layers);

export const x = restyle({ button: s.base });
