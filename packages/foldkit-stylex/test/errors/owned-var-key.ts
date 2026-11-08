// expect: "@foldkit/ui sets position inline on this part. Floating UI positions the panel and caps its height; size and scroll an element inside it."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { panel: s.inverted });
