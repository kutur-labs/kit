// expect: "An earlier styles object sets columnGap and rowGap on this part, which StyleX applies over gap whatever the order. Set columnGap and rowGap in this styles object too."
import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = DatePickerStyle.view(
  DatePicker.view,
  { calendar: { grid: s.gaps } },
  { calendar: { grid: (state) => state.viewMode === "Days" && s.gap } },
);
