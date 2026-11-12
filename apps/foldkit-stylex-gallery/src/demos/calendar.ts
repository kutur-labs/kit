import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Calendar } from "@kutur-kit/foldkit-stylex-theme/calendar";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Match, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import * as Dates from "foldkit/calendar";
import { defineMessageUnion } from "foldkit/message";

export const summary = "A month grid for picking a date with the pointer or the keyboard.";

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
    calendar: Calendar.init({ id: "deadline", today }),
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

const cellView =
  <M>(h: HtmlBuilder<M>) =>
  (cell: Calendar.DayCell | Calendar.MonthCell | Calendar.YearCell): Html =>
    h.div([...cell.cellAttributes], [h.button([...cell.buttonAttributes], [cell.label])]);

/**
 * Lays out each grid from the styled attributes, with the theme's `Calendar.header` and arrows.
 * DatePicker's `toCalendarView` takes the same function, so src/demos/date-picker.ts reuses it.
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
              [sx(Calendar.header.bar)],
              [
                h.button([...days.previousMonthButton], [Calendar.previousIcon()]),
                h.button(
                  [...days.headingButton],
                  [h.span([h.Id(days.heading.id)], [days.heading.text])],
                ),
                h.button([...days.nextMonthButton], [Calendar.nextIcon()]),
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
              [sx(Calendar.header.bar)],
              [
                h.button(
                  [...months.headingButton],
                  [h.span([h.Id(months.heading.id)], [months.heading.text])],
                ),
              ],
            ),
            // Short names: a full one such as "September" fills a third of the calendar's width.
            // Each button's name still holds the full one.
            h.div(
              [...months.grid],
              months.cells.map((cell) => cellView(h)({ ...cell, label: cell.shortLabel })),
            ),
          ],
        ),
      Years: (years) =>
        h.div(
          [...years.root],
          [
            h.div(
              [sx(Calendar.header.bar)],
              [
                h.button([...years.previousPageButton], [Calendar.previousIcon()]),
                h.span([h.Id(years.heading.id), sx(Calendar.header.title)], [years.heading.text]),
                h.button([...years.nextPageButton], [Calendar.nextIcon()]),
              ],
            ),
            h.div([...years.grid], years.cells.map(cellView(h))),
          ],
        ),
    });

/**
 * Names for the heading buttons that start with the month or year they show. @foldkit/ui's
 * defaults, such as "Switch to month picker", leave it out, but a control's name must hold the
 * text people see, so that speech input can say it (WCAG 2.5.3). DatePicker takes the same names.
 */
export const headingLabels = ({ viewYear, viewMonth, locale }: Calendar.Model) => ({
  daysHeadingButtonLabel: `${Dates.formatMonthYear(Dates.make(viewYear, viewMonth, 1), locale)}, choose a month`,
  monthsHeadingButtonLabel: `${viewYear}, choose a year`,
});

const styles = stylex.create({
  demo: { display: "grid", justifyItems: "center", gap: space.md },
  status: { margin: 0, color: color.muted, fontSize: fontSize.sm },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.demo)],
    [
      h.submodel({
        slotId: "deadline",
        model: model.calendar,
        view: Calendar.view,
        viewInputs: {
          maybeSelectedDate: model.maybeSelectedDate,
          toView: toCalendarView(h),
          ...headingLabels(model.calendar),
        },
        toParentMessage: (message) => Message.GotCalendarMessage({ message }),
      }),
      h.p(
        [sx(styles.status)],
        [
          Option.match(model.maybeSelectedDate, {
            onNone: () => "No date selected.",
            onSome: (date) => `Selected ${Dates.formatLong(date, model.calendar.locale)}.`,
          }),
        ],
      ),
    ],
  );
