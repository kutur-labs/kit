// expect: "@foldkit/ui sets transform inline on this part. Its position follows the value; use scale for press feedback."
import { Slider } from "@foldkit/ui";
import { SliderStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = SliderStyle.view(Slider.view, {
  thumb: (state) => [s.base, state.isDragging && s.pressed, state.isDisabled && s.open],
});
