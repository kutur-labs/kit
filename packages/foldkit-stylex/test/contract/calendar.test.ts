import type { Html, HtmlBuilder } from "foldkit/html";

import { Calendar } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Match, Option } from "effect";
import * as Dates from "foldkit/calendar";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { CalendarStyle } from "../../src/index.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isSelected: { fontWeight: 700 },
  isFocused: { outlineStyle: "solid" },
  isToday: { textDecorationLine: "underline" },
  isOutsideMonth: { opacity: 0.5 },
  isDisabled: { cursor: "not-allowed" },
  days: { gridTemplateColumns: "repeat(7, 1fr)" },
  root: { display: "inline-block" },
  previous: { inlineSize: 44 },
  next: { blockSize: 44 },
  heading: { fontSize: 18 },
  headerRow: { display: "contents" },
  columnHeader: { fontSize: 12 },
  week: { columnGap: 4 },
});

const flags = (state: CalendarStyle.CellState) => [
  state.isSelected && styles.isSelected,
  state.isFocused && styles.isFocused,
  state.isToday && styles.isToday,
  state.isOutsideMonth && styles.isOutsideMonth,
  state.isDisabled && styles.isDisabled,
];

const calendarView = CalendarStyle.view(Calendar.view, {
  root: styles.root,
  previousMonthButton: styles.previous,
  nextMonthButton: styles.next,
  previousPageButton: styles.previous,
  nextPageButton: styles.next,
  headingButton: styles.heading,
  grid: (state) => state.viewMode === "Days" && styles.days,
  headerRow: styles.headerRow,
  columnHeader: styles.columnHeader,
  week: styles.week,
  cell: flags,
  cellButton: flags,
});

type Model = Readonly<{
  calendar: Calendar.Model;
  maybeSelectedDate: Option.Option<Dates.CalendarDate>;
}>;

const cellView = (cell: Calendar.DayCell | Calendar.MonthCell | Calendar.YearCell, h: Builder) =>
  h.div([...cell.cellAttributes], [h.button([...cell.buttonAttributes], [cell.label])]);

type Builder = HtmlBuilder<Calendar.Message>;

const toView =
  (h: Builder) =>
  (attributes: Calendar.CalendarAttributes): Html =>
    Match.valueTags(attributes, {
      Days: (days) =>
        h.div(
          [...days.root],
          [
            h.button([...days.previousMonthButton, h.Id("previous")], ["Previous"]),
            h.button([...days.headingButton, h.Id("heading")], [days.heading.text]),
            h.button([...days.nextMonthButton, h.Id("next")], ["Next"]),
            h.div(
              [...days.grid],
              [
                h.div(
                  [...days.headerRow, h.Id("header-row")],
                  days.columnHeaders.map((header) => h.div([...header.attributes], [header.name])),
                ),
                ...days.weeks.map((week) =>
                  h.div(
                    [...week.attributes],
                    week.cells.map((cell) => cellView(cell, h)),
                  ),
                ),
              ],
            ),
          ],
        ),
      Months: (months) =>
        h.div(
          [...months.root],
          [
            h.button([...months.headingButton, h.Id("heading")], [months.heading.text]),
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
            h.button([...years.previousPageButton, h.Id("previous")], ["Previous"]),
            h.button([...years.nextPageButton, h.Id("next")], ["Next"]),
            h.div(
              [...years.grid],
              years.cells.map((cell) => cellView(cell, h)),
            ),
          ],
        ),
    });

const view = (model: Model, h: Builder) =>
  calendarView(
    model.calendar,
    { maybeSelectedDate: model.maybeSelectedDate, toView: toView(h) },
    h,
  );

const update = (model: Model, message: Calendar.Message) => ({
  model: { ...model, calendar: Calendar.update(model.calendar, message).model },
});

const date = Dates.make;

const today = date(2026, 11, 7);

const grid = Scene.selector("#due-grid");

const dayCell = (day: Dates.CalendarDate) => `#due-cell-${day.year}-${day.month}-${day.day}`;

type Expected = Readonly<{
  isSelected?: boolean;
  isFocused?: boolean;
  isToday?: boolean;
  isOutsideMonth?: boolean;
  isDisabled?: boolean;
}>;

// The cell's flags agree with its hooks, and the button inside it gets the same flags.
const cellAgrees = (selector: string, expected: Expected) =>
  (
    [
      ["data-selected", styles.isSelected, expected.isSelected],
      ["data-focused", styles.isFocused, expected.isFocused],
      ["data-today", styles.isToday, expected.isToday],
      ["data-outside-month", styles.isOutsideMonth, expected.isOutsideMonth],
      ["data-disabled", styles.isDisabled, expected.isDisabled],
    ] as const
  ).flatMap(([hook, style, on = false]) => [
    ...agrees(Scene.selector(selector), hook, style, on),
    on
      ? Scene.expect(Scene.selector(`${selector} button`)).toHaveClass(classOf(style))
      : Scene.expect(Scene.selector(`${selector} button`)).not.toHaveClass(classOf(style)),
  ]);

describe("CalendarStyle.view", () => {
  const days: Model = {
    calendar: {
      ...Calendar.init({ id: "due", today, disabledDates: [date(2026, 11, 2)] }),
      maybeFocusedDate: Option.some(date(2026, 11, 12)),
      isGridFocused: true,
    },
    maybeSelectedDate: Option.some(date(2026, 11, 10)),
  };

  const dayCells = [
    { day: date(2026, 11, 7), expected: { isToday: true } },
    { day: date(2026, 11, 10), expected: { isSelected: true } },
    { day: date(2026, 11, 12), expected: { isFocused: true } },
    { day: date(2026, 12, 1), expected: { isOutsideMonth: true } },
    { day: date(2026, 11, 2), expected: { isDisabled: true } },
  ];

  for (const { day, expected } of dayCells) {
    it(`sets each day flag where @foldkit/ui sets its hook: ${day.year}-${day.month}-${day.day}`, () => {
      Scene.scene({ update, view }, Scene.given(days), ...cellAgrees(dayCell(day), expected));
    });
  }

  it("sets isFocused only while the grid has focus", () => {
    Scene.scene(
      { update, view },
      Scene.given({ ...days, calendar: { ...days.calendar, isGridFocused: false } }),
      ...cellAgrees(dayCell(date(2026, 11, 12)), {}),
    );
  });

  const months: Model = {
    calendar: {
      ...Calendar.init({ id: "due", today, maxDate: date(2026, 11, 30) }),
      viewMode: "Months",
      viewMonth: 5,
      maybeFocusedDate: Option.some(date(2026, 8, 1)),
      isGridFocused: true,
    },
    maybeSelectedDate: Option.none(),
  };

  const monthCells = [
    { month: 11, expected: { isToday: true } },
    { month: 5, expected: { isSelected: true } },
    { month: 8, expected: { isFocused: true } },
    { month: 12, expected: { isDisabled: true } },
  ];

  for (const { month, expected } of monthCells) {
    it(`sets each month flag where @foldkit/ui sets its hook: ${month}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(months),
        ...cellAgrees(`#due-cell-month-${month}`, expected),
      );
    });
  }

  const years: Model = {
    calendar: {
      ...Calendar.init({ id: "due", today, maxDate: date(2026, 12, 31) }),
      viewMode: "Years",
      viewYear: 2020,
      maybeFocusedDate: Option.some(date(2018, 1, 1)),
      isGridFocused: true,
    },
    maybeSelectedDate: Option.none(),
  };

  const yearCells = [
    { year: 2026, expected: { isToday: true } },
    { year: 2020, expected: { isSelected: true } },
    { year: 2018, expected: { isFocused: true } },
    { year: 2027, expected: { isDisabled: true } },
  ];

  for (const { year, expected } of yearCells) {
    it(`sets each year flag where @foldkit/ui sets its hook: ${year}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(years),
        ...cellAgrees(`#due-cell-year-${year}`, expected),
      );
    });
  }

  it("passes the view mode to every part", () => {
    Scene.scene(
      { update, view },
      Scene.given(days),
      ...hasStyles(grid, styles.days),
      Scene.expect(Scene.selector("#due")).toHaveClass(classOf(styles.root)),
    );

    Scene.scene(
      { update, view },
      Scene.given(months),
      Scene.expect(grid).not.toHaveClass(classOf(styles.days)),
    );
  });

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(days),
      ...hasStyles(Scene.selector("#due"), styles.root),
      ...hasStyles(Scene.selector("#previous"), styles.previous),
      ...hasStyles(Scene.selector("#next"), styles.next),
      ...hasStyles(Scene.selector("#heading"), styles.heading),
      ...hasStyles(Scene.selector("#header-row"), styles.headerRow),
      ...hasStyles(Scene.selector('[role="columnheader"]'), styles.columnHeader),
      ...hasStyles(Scene.selector('[role="row"][aria-rowindex="2"]'), styles.week),
    );

    Scene.scene(
      { update, view },
      Scene.given(years),
      ...hasStyles(Scene.selector("#previous"), styles.previous),
      ...hasStyles(Scene.selector("#next"), styles.next),
    );
  });

  it("still moves the keyboard cursor in the styled grid", () => {
    const cursor = date(2026, 11, 12);
    const next = date(2026, 11, 13);

    Scene.scene(
      { update, view },
      Scene.given({ ...days, calendar: { ...days.calendar, isGridFocused: false } }),
      Scene.focus(grid),
      Scene.keydown(grid, "ArrowRight"),
      ...cellAgrees(dayCell(cursor), {}),
      ...cellAgrees(dayCell(next), { isFocused: true }),
    );
  });
});
