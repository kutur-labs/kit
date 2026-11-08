import type { DatePickerStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { calendarTheme } from "./calendar.ts";
import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { color, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  trigger: { minInlineSize: "12rem", textAlign: "start" },
  panel: { padding: space.sm },
  placeholder: { color: color.muted },
  icon: { color: color.muted, lineHeight: 1 },
});

/**
 * The look of a DatePicker: a trigger with a field's edge and a raised panel that fades in, holding
 * `calendarTheme`'s calendar. Render the calendar's header with `calendarHeader` from
 * `@kutur-kit/foldkit-stylex-theme/calendar`.
 */
export const datePickerTheme = {
  trigger: (state) => [
    base.button,
    field.button,
    base.focusRing,
    styles.trigger,
    state.isVisible && base.pressed,
    state.isDisabled && base.disabled,
  ],
  panel: (state) => [base.panel, base.transition, styles.panel, state.isClosed && base.closed],
  calendar: calendarTheme,
} satisfies DatePickerStyle.Styles;

/**
 * Elements you render from `triggerContent`, which returns one element:
 * `sx(datePickerTrigger.content)` around the date and a glyph after it. The text while no date is
 * chosen: `sx(datePickerTrigger.placeholder)`. The glyph: `sx(datePickerTrigger.icon)`.
 */
export const datePickerTrigger = {
  content: base.buttonContent,
  placeholder: styles.placeholder,
  icon: styles.icon,
};
