import type { Html, HtmlBuilder } from "foldkit/html";

import { DatePicker } from "@foldkit/ui";
import { DatePickerStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import * as Dates from "foldkit/calendar";
import { defineMessageUnion } from "foldkit/message";

import { calendarStyles, toCalendarView } from "./calendar.ts";

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

const styles = stylex.create({
  // Room below the trigger for the panel.
  wrapper: { paddingBlockEnd: 400 },
  trigger: { minBlockSize: 44, minInlineSize: 192, font: "inherit" },
  triggerOpen: { fontWeight: 700 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    padding: 8,
    backgroundColor: "Canvas",
    color: "CanvasText",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
    transitionProperty: "opacity",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  panelClosed: { opacity: 0 },
  backdrop: { backgroundColor: "rgb(0 0 0 / 0.1)" },
});

// The calendar's parts go under `calendar`: here the styles of the Calendar demo.
const datePickerView = DatePickerStyle.view(DatePicker.view, {
  wrapper: styles.wrapper,
  trigger: (state) => [styles.trigger, state.isVisible && styles.triggerOpen],
  panel: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  backdrop: styles.backdrop,
  calendar: calendarStyles,
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
          [],
          [
            Option.match(maybeDate, {
              onNone: () => "Pick a due date",
              onSome: (date) => Dates.formatLong(date, model.datePicker.calendar.locale),
            }),
          ],
        ),
      toCalendarView: toCalendarView(h),
    },
    toParentMessage: (message) => Message.GotDatePickerMessage({ message }),
  });
