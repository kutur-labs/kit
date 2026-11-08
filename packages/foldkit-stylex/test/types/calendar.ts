import type { Option } from "effect";
import type * as Dates from "foldkit/calendar";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Calendar } from "@foldkit/ui";
import { CalendarStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Match } from "effect";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotDueMessage: { message: Calendar.Message } });

type Message = typeof Message.Type;

const styles = stylex.create({
  days: { display: "grid", gridTemplateColumns: "repeat(7, 2.75rem)" },
  months: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)" },
  cell: { display: "grid", placeItems: "center" },
  button: { minInlineSize: 44, minBlockSize: 44, cursor: "pointer" },
  selected: { backgroundColor: "black", color: "white" },
  focused: { outline: "2px solid royalblue" },
  today: { fontWeight: 700 },
  outside: { opacity: 0.5 },
  disabled: { cursor: "not-allowed", textDecorationLine: "line-through" },
});

// A theme every calendar shares, DatePicker's included; `satisfies` types each state parameter.
export const calendarTheme = {
  grid: (state) => (state.viewMode === "Days" ? styles.days : styles.months),
  cell: styles.cell,
  cellButton: (state) => [
    styles.button,
    state.isToday && styles.today,
    state.isOutsideMonth && styles.outside,
    state.isSelected && styles.selected,
    state.isFocused && styles.focused,
    state.isDisabled && styles.disabled,
  ],
} satisfies CalendarStyle.Styles;

const calendarView = CalendarStyle.view(Calendar.view, calendarTheme, {
  headingButton: (state) => state.viewMode !== "Years" && styles.today,
});

const cellView = <M>(
  cell: Calendar.DayCell | Calendar.MonthCell | Calendar.YearCell,
  h: HtmlBuilder<M>,
) => h.div([...cell.cellAttributes], [h.button([...cell.buttonAttributes], [cell.label])]);

// `attributes` stays @foldkit/ui's union, so each mode narrows to its own bundles. DatePicker's
// `toCalendarView` takes the same function.
export const toCalendarView =
  <M>(h: HtmlBuilder<M>) =>
  (attributes: Calendar.CalendarAttributes): Html =>
    Match.valueTags(attributes, {
      Days: (days) =>
        h.div(
          [...days.root],
          [
            h.button([...days.previousMonthButton], ["‹"]),
            h.button(
              [...days.headingButton],
              [h.span([h.Id(days.heading.id)], [days.heading.text])],
            ),
            h.button([...days.nextMonthButton], ["›"]),
            h.div(
              [...days.grid],
              days.weeks.flatMap((week) => week.cells.map((cell) => cellView(cell, h))),
            ),
          ],
        ),
      Months: (months) =>
        h.div(
          [...months.root],
          [
            h.button([...months.headingButton], [months.heading.text]),
            h.div(
              [...months.grid],
              months.cells.map((cell) => cellView(cell, h)),
            ),
          ],
        ),
      Years: (years) =>
        h.div(
          [...years.root],
          [
            h.button([...years.previousPageButton], ["‹"]),
            h.div(
              [...years.grid],
              years.cells.map((cell) => cellView(cell, h)),
            ),
            h.button([...years.nextPageButton], ["›"]),
          ],
        ),
    });

export const due = (
  model: Calendar.Model,
  maybeSelectedDate: Option.Option<Dates.CalendarDate>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: calendarView,
    viewInputs: {
      maybeSelectedDate,
      previousMonthLabel: "poprzedni miesiąc",
      nextMonthLabel: "następny miesiąc",
      toView: toCalendarView(h),
    },
    toParentMessage: (message) => Message.GotDueMessage({ message }),
  });
