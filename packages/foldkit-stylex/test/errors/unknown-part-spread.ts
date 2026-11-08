// expect: "pannel names no part, so its styles would reach no element. Write arrow, backdrop, button, panel or wrapper."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const look = { panel: s.base } satisfies PopoverStyle.Styles;

export const x = PopoverStyle.view(Popover.view, { ...look, pannel: s.open });
