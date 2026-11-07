// expect: "@kutur-kit/foldkit-stylex sets translate on this part so the component works. It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { arrow: s.base }, { arrow: s.shifted });
