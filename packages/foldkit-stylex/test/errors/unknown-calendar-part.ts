// expect: "cellButon names no part, so its styles would reach no element. Write cell, cellButton, columnHeader, grid, headerRow, headingButton, nextMonthButton, nextPageButton, previousMonthButton, previousPageButton, root or week."
import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = DatePickerStyle.view(DatePicker.view, {
  calendar: { cell: s.base, cellButon: s.open },
});
