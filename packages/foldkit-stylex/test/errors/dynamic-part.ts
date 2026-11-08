// expect: "Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style. For a runtime value, set a custom property with h.Style on your own element around the part and read it with var() in the part's styles; a portaled panel inherits from none of your elements, so set it on an element you render inside the panel and style that element."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { panel: s.tilt(3) });
