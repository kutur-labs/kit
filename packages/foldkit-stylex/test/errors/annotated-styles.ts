// expect: "These styles have a type annotation, which hides the properties they set from this view's checks. Write satisfies instead of the annotation, and pass the styles to the view where they are written."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const look: PopoverStyle.Styles = { panel: s.base };

export const x = PopoverStyle.view(Popover.view, look);
