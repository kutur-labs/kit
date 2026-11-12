// @foldkit/ui's DatePicker with `view` themed, plus `restyle` and `triggerContent`.
import type { CalendarDate } from "foldkit/calendar";

import * as Core from "@foldkit/ui/datePicker";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import * as Option from "effect/Option";

import { space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { theme as calendar } from "./calendar-theme.ts";
import { field } from "./field.ts";
import { calendar as calendarIcon, labelled, placeholder as muted } from "./marks.ts";

export * from "@foldkit/ui/datePicker";

const styles = stylex.create({
  // A list's padding, which radius.panel adds to the controls' radius: the panel's corners share a
  // centre with the corner buttons'. Under a finger, seven 44px days make the calendar 308px, so
  // inline the panel keeps 1px, which holds the corner days' hit areas inside its rounded scroll
  // clip: with forced colors' edge it is 312px, which a 320px screen (WCAG 1.4.10) holds beside an
  // 8px anchor padding.
  panel: { padding: space.xs, paddingInline: { default: null, "@media (pointer: coarse)": 1 } },
});

// A trigger with a field's edge and a raised panel that grows from it, holding Calendar's look.
const theme = {
  trigger: (state) => [
    base.button,
    field.button,
    field.wide,
    field.trigger,
    base.focusRing,
    state.isDisabled && base.disabledButton,
  ],
  panel: (state) => [base.panel, base.transition, styles.panel, state.isClosed && base.closed],
  calendar,
} satisfies DatePickerStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = DatePickerStyle.Styles;

/** `DatePicker.ViewInputs` without the class names the theme fills. */
export type ViewInputs = DatePickerStyle.ViewInputs;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: DatePickerStyle.Layers<List, [typeof theme]>
) => ({ view: DatePickerStyle.view(Core.view, theme, ...layers) });

/** `DatePicker.view`, styled by the theme. */
export const { view } = restyle();

/**
 * The `triggerContent` input: the chosen date written by `format`, or `placeholder`, muted, while
 * none is chosen, then a calendar at the end.
 */
export const triggerContent =
  (
    format: (date: CalendarDate) => string,
    placeholder: string,
  ): Core.ViewInputs["triggerContent"] =>
  (maybeDate) =>
    labelled(
      Option.match(maybeDate, { onNone: () => muted(placeholder), onSome: format }),
      calendarIcon(),
    );
