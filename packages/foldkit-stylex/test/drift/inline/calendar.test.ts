import type { CalendarStyle } from "../../../src/index.ts";
import type * as Own from "../../../src/internal/owned.ts";
import type { ChildAttribute, HtmlBuilder } from "foldkit/html";

import { Calendar } from "@foldkit/ui";
import { Match, Option } from "effect";
import * as Dates from "foldkit/calendar";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

type Part = keyof CalendarStyle.Styles;

// Each part's bundle in the attributes' view mode; the first cell, header and week stand for all.
const bundlesOf = (
  attributes: Calendar.CalendarAttributes,
): Readonly<Partial<Record<Part, ReadonlyArray<ChildAttribute> | undefined>>> => {
  const cell = (
    cells: ReadonlyArray<Calendar.DayCell | Calendar.MonthCell | Calendar.YearCell>,
  ) => ({
    cell: cells[0]?.cellAttributes,
    cellButton: cells[0]?.buttonAttributes,
  });

  return {
    root: attributes.root,
    grid: attributes.grid,
    ...Match.valueTags(attributes, {
      Days: (days) => ({
        ...cell(days.weeks[0]?.cells ?? []),
        previousMonthButton: days.previousMonthButton,
        nextMonthButton: days.nextMonthButton,
        headingButton: days.headingButton,
        headerRow: days.headerRow,
        columnHeader: days.columnHeaders[0]?.attributes,
        week: days.weeks[0]?.attributes,
      }),
      Months: (months) => ({ ...cell(months.cells), headingButton: months.headingButton }),
      Years: (years) => ({
        ...cell(years.cells),
        previousPageButton: years.previousPageButton,
        nextPageButton: years.nextPageButton,
      }),
    }),
  };
};

const modes = [
  {
    viewMode: "Days",
    parts: [
      "root",
      "grid",
      "cell",
      "cellButton",
      "previousMonthButton",
      "nextMonthButton",
      "headingButton",
      "headerRow",
      "columnHeader",
      "week",
    ],
  },
  { viewMode: "Months", parts: ["root", "grid", "cell", "cellButton", "headingButton"] },
  {
    viewMode: "Years",
    parts: ["root", "grid", "cell", "cellButton", "previousPageButton", "nextPageButton"],
  },
] as const satisfies ReadonlyArray<
  Readonly<{ viewMode: Calendar.ViewMode; parts: ReadonlyArray<Part> }>
>;

it("@foldkit/ui writes nothing inline on Calendar's parts, in any view mode", () => {
  const none = owns<Own.None>()();
  const seen = new Set<string>();

  for (const { viewMode, parts } of modes) {
    Scene.scene(
      {
        update: (model: Calendar.Model) => ({ model }),
        view: (model: Calendar.Model, h: HtmlBuilder<Calendar.Message>) =>
          Calendar.view(
            model,
            {
              maybeSelectedDate: Option.none(),
              toView: (attributes) =>
                h.div(
                  [],
                  Object.entries(bundlesOf(attributes)).map(([part, bundle = []]) =>
                    h.div([...bundle, h.DataAttribute("part", part)], []),
                  ),
                ),
            },
            h,
          ),
      },
      Scene.given({ ...Calendar.init({ id: "due", today: Dates.make(2026, 11, 7) }), viewMode }),
      ...parts.map((part) => inline(`[data-part="${part}"]`, seen)),
    );
  }

  expect(sorted(seen)).toEqual(sorted(none));
});
