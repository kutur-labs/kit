import type { Html, HtmlBuilder } from "foldkit/html";

import { Calendar } from "@foldkit/ui";
import { CalendarStyle, sx } from "@kutur-kit/foldkit-stylex";
import { calendarHeader, calendarTheme } from "@kutur-kit/foldkit-stylex-theme/calendar";
import * as stylex from "@stylexjs/stylex";
import { Match, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import * as Dates from "foldkit/calendar";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({
  calendar: Calendar.Model,
  maybeSelectedDate: Schema.Option(Dates.CalendarDate),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotCalendarMessage: { message: Calendar.Message } });

export type Message = typeof Message.Type;

// A fixed today, so the server and the browser start from the same model.
const today = Dates.make(2026, 11, 8);

export const init = (): Update.Return<Model, Message> => ({
  model: {
    calendar: Calendar.init({ id: "themed-deadline", today, disabledDaysOfWeek: ["Sunday"] }),
    maybeSelectedDate: Option.some(Dates.make(2026, 11, 13)),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotCalendarMessage: ({ message }) => {
      const next = Calendar.update(model.calendar, message);

      return {
        model: {
          calendar: next.model,
          maybeSelectedDate:
            next.outMessage?._tag === "SelectedDate"
              ? Option.some(next.outMessage.date)
              : model.maybeSelectedDate,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotCalendarMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  round: { borderRadius: "50%" },
});

// The app's styles layered over the look: the look's square cells, with the chosen day round.
const calendarView = CalendarStyle.view(Calendar.view, calendarTheme, {
  cellButton: (state) => state.isSelected && state.viewMode === "Days" && styles.round,
});

const cellView =
  <M>(h: HtmlBuilder<M>) =>
  (cell: Calendar.DayCell | Calendar.MonthCell | Calendar.YearCell): Html =>
    h.div([...cell.cellAttributes], [h.button([...cell.buttonAttributes], [cell.label])]);

/**
 * Lays out each grid from the attributes CalendarStyle styled, with the look's `calendarHeader`.
 * DatePicker's `toCalendarView` takes the same function, so src/themed/date-picker.ts reuses it.
 */
export const toCalendarView =
  <M>(h: HtmlBuilder<M>) =>
  (attributes: Calendar.CalendarAttributes): Html =>
    Match.valueTags(attributes, {
      Days: (days) =>
        h.div(
          [...days.root],
          [
            h.div(
              [sx(calendarHeader.bar)],
              [
                h.button([...days.previousMonthButton], ["‹"]),
                h.button(
                  [...days.headingButton],
                  [h.span([h.Id(days.heading.id)], [days.heading.text])],
                ),
                h.button([...days.nextMonthButton], ["›"]),
              ],
            ),
            h.div(
              [...days.grid],
              [
                h.div(
                  [...days.headerRow],
                  days.columnHeaders.map((header) => h.div([...header.attributes], [header.name])),
                ),
                ...days.weeks.map((week) =>
                  h.div([...week.attributes], week.cells.map(cellView(h))),
                ),
              ],
            ),
          ],
        ),
      Months: (months) =>
        h.div(
          [...months.root],
          [
            h.div(
              [sx(calendarHeader.bar)],
              [
                h.button(
                  [...months.headingButton],
                  [h.span([h.Id(months.heading.id)], [months.heading.text])],
                ),
              ],
            ),
            h.div([...months.grid], months.cells.map(cellView(h))),
          ],
        ),
      Years: (years) =>
        h.div(
          [...years.root],
          [
            h.div(
              [sx(calendarHeader.bar)],
              [
                h.button([...years.previousPageButton], ["‹"]),
                h.span([h.Id(years.heading.id), sx(calendarHeader.title)], [years.heading.text]),
                h.button([...years.nextPageButton], ["›"]),
              ],
            ),
            h.div([...years.grid], years.cells.map(cellView(h))),
          ],
        ),
    });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: "deadline",
        model: model.calendar,
        view: calendarView,
        viewInputs: {
          maybeSelectedDate: model.maybeSelectedDate,
          toView: toCalendarView(h),
        },
        toParentMessage: (message) => Message.GotCalendarMessage({ message }),
      }),
      h.p(
        [],
        [
          Option.match(model.maybeSelectedDate, {
            onNone: () => "No date selected.",
            onSome: (date) => `Selected ${Dates.formatLong(date, model.calendar.locale)}.`,
          }),
        ],
      ),
    ],
  );
