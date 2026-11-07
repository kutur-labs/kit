// expect: "Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { panel: s.tilt(3) });
