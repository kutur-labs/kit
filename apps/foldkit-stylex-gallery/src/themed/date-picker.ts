import type { Html, HtmlBuilder } from "foldkit/html";

import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle, sx } from "@kutur-kit/foldkit-stylex";
import { datePickerTheme, datePickerTrigger } from "@kutur-kit/foldkit-stylex-theme/date-picker";
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import * as Dates from "foldkit/calendar";
import { defineMessageUnion } from "foldkit/message";

import { toCalendarView } from "./calendar.ts";

export const Model = Schema.Struct({
  datePicker: DatePicker.Model,
  maybeSelectedDate: Schema.Option(Dates.CalendarDate),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDatePickerMessage: { message: DatePicker.Message },
});

export type Message = typeof Message.Type;

// A fixed today, so the server and the browser start from the same model.
const today = Dates.make(2026, 11, 8);

export const init = (): Update.Return<Model, Message> => ({
  model: {
    datePicker: DatePicker.init({ id: "themed-due", today, isAnimated: true, minDate: today }),
    maybeSelectedDate: Option.none(),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDatePickerMessage: ({ message }) => {
      const next = DatePicker.update(model.datePicker, message);

      return {
        model: {
          datePicker: next.model,
          maybeSelectedDate:
            next.outMessage?._tag === "SelectedDate"
              ? Option.some(next.outMessage.date)
              : model.maybeSelectedDate,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotDatePickerMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // Room below the trigger for the panel.
  wrapper: { paddingBlockEnd: 440 },
  // A token set on the panel reaches it in the portal root and the calendar inside it.
  violet: { [color.accent]: "light-dark(#6d28d9, #c4b5fd)" },
});

const datePickerView = DatePickerStyle.view(DatePicker.view, datePickerTheme, {
  wrapper: styles.wrapper,
  panel: styles.violet,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "due",
    model: model.datePicker,
    view: datePickerView,
    viewInputs: {
      anchor: { placement: "bottom-start", gap: 4 },
      maybeSelectedDate: model.maybeSelectedDate,
      ariaLabel: "Due date",
      triggerContent: (maybeDate) =>
        h.span(
          [sx(datePickerTrigger.content)],
          [
            Option.match(maybeDate, {
              onNone: () => h.span([sx(datePickerTrigger.placeholder)], ["Pick a due date"]),
              onSome: (date) =>
                h.span([], [Dates.formatLong(date, model.datePicker.calendar.locale)]),
            }),
            h.span([sx(datePickerTrigger.icon)], ["▾"]),
          ],
        ),
      toCalendarView: toCalendarView(h),
    },
    toParentMessage: (message) => Message.GotDatePickerMessage({ message }),
  });
