import type { HtmlBuilder } from "foldkit/html";

import { DatePicker } from "@foldkit/ui";
import { Option } from "effect";
import * as Dates from "foldkit/calendar";
import * as Scene from "foldkit/scene";
import { defineView } from "foldkit/submodel";
import { expect, it } from "vitest";

import { DatePickerStyle } from "../../../src/index.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs DatePickerStyle fills", () => {
  const filled = new Set<string>();

  // Records the inputs DatePickerStyle passes on. The calendar's parts are checked in calendar.test.ts.
  const recording = defineView<DatePicker.Model, DatePicker.Message, DatePicker.ViewInputs>(
    (_model, inputs, h) => {
      for (const input of Object.keys(inputs)) {
        filled.add(input);
      }

      return h.div([], []);
    },
  );

  const datePickerView = DatePickerStyle.view(recording);

  Scene.scene(
    {
      update: (model: DatePicker.Model) => ({ model }),
      view: (model: DatePicker.Model, h: HtmlBuilder<DatePicker.Message>) =>
        datePickerView(
          model,
          {
            anchor: {},
            maybeSelectedDate: Option.none(),
            triggerContent: () => h.span([], []),
            toCalendarView: () => h.div([], []),
          },
          h,
        ),
    },
    Scene.given(DatePicker.init({ id: "due", today: Dates.make(2026, 11, 7) })),
  );

  expect(declaredClassNames("./datePicker/index.d.ts")).toEqual(
    [...filled].filter((input) => input.endsWith("ClassName") || input === "className").sort(),
  );
});
