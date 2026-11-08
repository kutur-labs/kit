// expect: Property 'opn' does not exist on type
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { panel: [s.base, s.opn] });
