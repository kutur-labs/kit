import type { CalendarStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Calendar } from "@foldkit/ui";
import { Match, Option } from "effect";
import * as Dates from "foldkit/calendar";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { bundleKeys, expected } from "./bundles.ts";

type Part = keyof CalendarStyle.Styles;

// Each view mode's bundles, which have the names of the parts that style them, and its lists of
// nested bundles, checked below.
const modes = [
  {
    viewMode: "Days",
    parts: [
      "root",
      "previousMonthButton",
      "nextMonthButton",
      "headingButton",
      "grid",
      "headerRow",
    ] satisfies ReadonlyArray<Part>,
    lists: ["columnHeaders", "weeks"],
  },
  {
    viewMode: "Months",
    parts: ["root", "headingButton", "grid"] satisfies ReadonlyArray<Part>,
    lists: ["cells"],
  },
  {
    viewMode: "Years",
    parts: ["root", "previousPageButton", "nextPageButton", "grid"] satisfies ReadonlyArray<Part>,
    lists: ["cells"],
  },
] as const;

// Nested bundles by the part that styles them.
const nested = {
  columnHeader: { attributes: "columnHeader" },
  week: { attributes: "week" },
  cell: { cellAttributes: "cell", buttonAttributes: "cellButton" },
} as const satisfies Readonly<Record<string, Readonly<Record<string, Part>>>>;

const keysOf = <Render extends object>(
  id: string,
  render: Render,
  h: HtmlBuilder<Calendar.Message>,
) => h.div([h.Id(id), h.DataAttribute("keys", bundleKeys(render))], []);

for (const { viewMode, parts, lists } of modes) {
  it(`@foldkit/ui renders the parts CalendarStyle styles: ${viewMode}`, () => {
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
                  [
                    keysOf("attributes", attributes, h),
                    ...Match.valueTags(attributes, {
                      Days: ({ columnHeaders, weeks }) => [
                        keysOf("column-header", columnHeaders[0] ?? {}, h),
                        keysOf("week", weeks[0] ?? {}, h),
                        keysOf("cell", weeks[0]?.cells[0] ?? {}, h),
                      ],
                      Months: ({ cells }) => [keysOf("cell", cells[0] ?? {}, h)],
                      Years: ({ cells }) => [keysOf("cell", cells[0] ?? {}, h)],
                    }),
                  ],
                ),
            },
            h,
          ),
      },
      Scene.given({
        ...Calendar.init({ id: "due", today: Dates.make(2026, 11, 7) }),
        viewMode,
      }),
      Scene.expect(Scene.selector("#attributes")).toHaveAttr(
        "data-keys",
        expected(...parts, ...lists),
      ),
      Scene.expect(Scene.selector("#cell")).toHaveAttr(
        "data-keys",
        expected(...Object.keys(nested.cell)),
      ),
      ...(viewMode === "Days"
        ? [
            Scene.expect(Scene.selector("#column-header")).toHaveAttr(
              "data-keys",
              expected(...Object.keys(nested.columnHeader)),
            ),
            // `cells` holds the day cells, checked above.
            Scene.expect(Scene.selector("#week")).toHaveAttr(
              "data-keys",
              expected(...Object.keys(nested.week), "cells"),
            ),
          ]
        : []),
    );
  });
}
