import type * as Dates from "foldkit/calendar";
import type { Html, HtmlBuilder } from "foldkit/html";

import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { calendarTheme, toCalendarView } from "./calendar.ts";

const Message = defineMessageUnion({ GotDueDateMessage: { message: DatePicker.Message } });

type Message = typeof Message.Type;

const styles = stylex.create({
  trigger: { minBlockSize: 44, paddingInline: 12 },
  open: { fontWeight: 700 },
  disabled: { opacity: 0.5 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    padding: 8,
    backgroundColor: "white",
    color: "black",
    transitionProperty: "opacity",
    transitionDuration: "150ms",
  },
  closed: { opacity: 0 },
  dim: { backgroundColor: "rgb(0 0 0 / 0.1)" },
  week: { display: "contents" },
});

// The calendar takes CalendarStyle's styles, here a shared theme with one part added.
const datePickerView = DatePickerStyle.view(DatePicker.view, {
  trigger: (state) => [
    styles.trigger,
    state.isVisible && styles.open,
    state.isDisabled && styles.disabled,
  ],
  panel: (state) => [styles.panel, state.isClosed && styles.closed],
  backdrop: styles.dim,
  calendar: { ...calendarTheme, week: (state) => state.viewMode === "Days" && styles.week },
});

export const dueDate = (
  model: DatePicker.Model,
  maybeSelectedDate: Option.Option<Dates.CalendarDate>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: datePickerView,
    viewInputs: {
      anchor: { placement: "bottom-start", gap: 4 },
      maybeSelectedDate,
      name: "due",
      ariaLabel: "termin",
      triggerContent: (maybeDate) =>
        h.span(
          [],
          [
            Option.match(maybeDate, {
              onNone: () => "wybierz datę",
              onSome: (date) => `${date.day}.${date.month}.${date.year}`,
            }),
          ],
        ),
      toCalendarView: toCalendarView(h),
    },
    toParentMessage: (message) => Message.GotDueDateMessage({ message }),
  });
