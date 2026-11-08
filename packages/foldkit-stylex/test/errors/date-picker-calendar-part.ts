// expect: "DatePicker styles its calendar under calendar: put these styles under calendar.cell."
import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = DatePickerStyle.view(DatePicker.view, { cell: s.base });
