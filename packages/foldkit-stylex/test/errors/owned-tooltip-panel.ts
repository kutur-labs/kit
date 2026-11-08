// expect: "@foldkit/ui sets pointerEvents inline on this part. A tooltip is not interactive; put interactive content in a Popover."
import { Tooltip } from "@foldkit/ui";
import { TooltipStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = TooltipStyle.view(Tooltip.view, {
  panel: (state) => [s.base, state.isVisible && s.clickable],
});
