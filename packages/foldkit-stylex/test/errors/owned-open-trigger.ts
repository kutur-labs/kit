// expect: "@foldkit/ui sets zIndex inline on this part. It is set only while the panel is open, so a class value would apply only while it is closed. Layer the trigger with zIndex on wrapper, and position an element of your own inside or around it."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = PopoverStyle.view(Popover.view, {
  button: (state) => [s.base, state.isVisible && s.raised],
});
