import type { Html, HtmlBuilder } from "foldkit/html";

import { DatePicker } from "@kutur-kit/foldkit-stylex-theme/date-picker";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import * as Dates from "foldkit/calendar";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";
import { field, labelledBy } from "../field.ts";
import { headingLabels, toCalendarView } from "./calendar.ts";

export const summary = "A button that opens a calendar to pick one date.";

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
    datePicker: DatePicker.init({ id: "due", today, isAnimated: true, minDate: today }),
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const format = Dates.formatLong(model.datePicker.calendar.locale);

  const trigger = DatePicker.triggerId(model.datePicker.id);

  return field(h, { controlId: trigger, text: "Due date" }, [
    h.submodel({
      slotId: "due",
      model: model.datePicker,
      view: DatePicker.view,
      viewInputs: {
        anchor: { placement: "bottom-start", gap: 4, padding: viewportPadding },
        maybeSelectedDate: model.maybeSelectedDate,
        ariaLabelledBy: labelledBy(trigger),
        triggerContent: DatePicker.triggerContent(format, "None"),
        toCalendarView: toCalendarView(h),
        ...headingLabels(model.datePicker.calendar),
      },
      toParentMessage: (message) => Message.GotDatePickerMessage({ message }),
    }),
  ]);
};
