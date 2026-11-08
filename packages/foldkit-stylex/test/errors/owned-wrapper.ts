// expect: "@kutur-kit/foldkit-stylex sets position on this part so the component works. Inside a <dialog>, @foldkit/ui moves the backdrop next to this wrapper, so it stays positioned. To place the component, position an element of your own around it."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, { wrapper: s.absolute });
