// expect: "DatePicker calls its button trigger: put these styles under trigger."
import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = DatePickerStyle.view(DatePicker.view, { button: s.base });
