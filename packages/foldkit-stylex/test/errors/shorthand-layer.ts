// expect: "An earlier styles object sets paddingInline on this part, which StyleX applies over padding whatever the order. Set paddingInline in this styles object too."
import { Button } from "@foldkit/ui";
import { ButtonStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = ButtonStyle.view(Button.view, { button: s.inline }, { button: s.base });
