// Styles, state and the styled attributes shared by CalendarStyle.view and DatePickerStyle.view,
// whose panel renders a calendar through `toCalendarView`.
import type { Calendar } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import * as Match from "effect/Match";

import { appendChildClass, partsOf, type PartStyle } from "./part.ts";

/** A calendar's state, the same for each part but `cell` and `cellButton`. */
export interface State {
  /** The grid on show: days, months or years. Lay the grid out for it: 7 columns of days, or 12 cells. */
  readonly viewMode: Calendar.ViewMode;
}

/**
 * A cell's state, the same for the gridcell and the button inside it. @foldkit/ui marks the
 * gridcell, not the button, so a `data-*` selector on the button never matches; these flags do.
 */
export interface CellState extends State {
  /**
   * The selected date, or in the month and year grids the month or year on show. @foldkit/ui
   * marks it with `data-selected`.
   */
  readonly isSelected: boolean;
  /**
   * The keyboard cursor, marked with `data-focused`. True only while the grid has DOM focus: the
   * grid keeps focus and points at the cell with `aria-activedescendant`, so `:focus-visible` never
   * matches a cell.
   */
  readonly isFocused: boolean;
  /** Today's date, or in the month and year grids today's month or year, marked with `data-today`. */
  readonly isToday: boolean;
  /**
   * A day of the previous or next month that fills the day grid's first or last week, marked
   * with `data-outside-month`. Always false in the month and year grids.
   */
  readonly isOutsideMonth: boolean;
  /** Before the minimum, after the maximum, or a disabled date or weekday; `data-disabled`. */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Calendar. */
export interface Styles {
  /** The element around the whole calendar. */
  readonly root?: PartStyle<State>;
  /** Shows the previous month in the day grid. */
  readonly previousMonthButton?: PartStyle<State>;
  /** Shows the next month in the day grid. */
  readonly nextMonthButton?: PartStyle<State>;
  /** Shows the previous 12 years in the year grid. */
  readonly previousPageButton?: PartStyle<State>;
  /** Shows the next 12 years in the year grid. */
  readonly nextPageButton?: PartStyle<State>;
  /**
   * Switches from the day grid to the month grid, and from the month grid to the year grid. Put
   * the heading text, which has an id but no attributes of its own, inside it.
   */
  readonly headingButton?: PartStyle<State>;
  /** Holds the focus while the calendar takes keys; style its focus ring with `':focus-visible'`. */
  readonly grid?: PartStyle<State>;
  /** The row of weekday names above the day grid. */
  readonly headerRow?: PartStyle<State>;
  /** One weekday name. */
  readonly columnHeader?: PartStyle<State>;
  /** One row of seven days. */
  readonly week?: PartStyle<State>;
  /** A day, month or year gridcell, which carries @foldkit/ui's `data-*` state. */
  readonly cell?: PartStyle<CellState>;
  /** The button inside each cell, which a click selects. */
  readonly cellButton?: PartStyle<CellState>;
}

type Bundle = ReadonlyArray<ChildAttribute>;

type Cell = Readonly<{
  cellAttributes: Bundle;
  buttonAttributes: Bundle;
  isSelected: boolean;
  isFocused: boolean;
  isDisabled: boolean;
}>;

type DayCell = Cell & Readonly<{ isToday: boolean; isInViewMonth: boolean }>;

type MonthCell = Cell & Readonly<{ isCurrentMonth: boolean }>;

type YearCell = Cell & Readonly<{ isCurrentYear: boolean }>;

// A column header or a week: an element with one bundle.
type Row = Readonly<{ attributes: Bundle }>;

// Everything the calendar's parts and cell state read from the attributes `toView` gets.
// `styledAttributes` reads only through these types.
type AttributeReads = Readonly<{
  Attributes: Readonly<{ _tag: "Days" | "Months" | "Years"; root: Bundle; grid: Bundle }>;
  DaysAttributes: Readonly<
    Record<"previousMonthButton" | "nextMonthButton" | "headingButton" | "headerRow", Bundle> & {
      columnHeaders: ReadonlyArray<Row>;
      weeks: ReadonlyArray<Row & Readonly<{ cells: ReadonlyArray<DayCell> }>>;
    }
  >;
  MonthsAttributes: Readonly<{
    headingButton: Bundle;
    cells: ReadonlyArray<MonthCell>;
  }>;
  YearsAttributes: Readonly<
    Record<"previousPageButton" | "nextPageButton", Bundle> & {
      cells: ReadonlyArray<YearCell>;
    }
  >;
}>;

/**
 * Everything a calendar view reads from @foldkit/ui: that its `ToView` input, Calendar's `toView`
 * or DatePicker's `toCalendarView`, still gets the attributes, and what the parts and cell state
 * read from them. `Supported` checks that the installed @foldkit/ui still has them, and
 * `Attributes._tag` that it has no view mode this package does not style.
 */
export type Reads<ToView extends string> = AttributeReads &
  Readonly<{ ViewInputs: Readonly<Record<ToView, (attributes: never) => void>> }>;

/** The @foldkit/ui types `Reads` is checked against, under the same names, with the view's inputs. */
export type Has<Inputs> = Readonly<{
  ViewInputs: Inputs;
  Attributes: Calendar.CalendarAttributes;
  DaysAttributes: Calendar.DaysModeAttributes;
  MonthsAttributes: Calendar.MonthsModeAttributes;
  YearsAttributes: Calendar.YearsModeAttributes;
}>;

/** The attributes the app's `toView` or `toCalendarView` gets, each bundle with its part's class. */
export const styledAttributes = (
  layers: ReadonlyArray<Styles>,
  attributes: Calendar.CalendarAttributes,
): Calendar.CalendarAttributes => {
  const reads: AttributeReads["Attributes"] = attributes;
  const state: State = { viewMode: reads._tag };
  const part = partsOf(layers, state);

  // Generic, so the cell keeps the fields this package does not read.
  const styledCell = <C extends Cell>(cell: C, isToday: boolean, isOutsideMonth: boolean): C => {
    const cellPart = partsOf(layers, {
      ...state,
      isSelected: cell.isSelected,
      isFocused: cell.isFocused,
      isToday,
      isOutsideMonth,
      isDisabled: cell.isDisabled,
    } satisfies CellState);

    return {
      ...cell,
      cellAttributes: appendChildClass(
        cell.cellAttributes,
        cellPart((s) => s.cell),
      ),
      buttonAttributes: appendChildClass(
        cell.buttonAttributes,
        cellPart((s) => s.cellButton),
      ),
    };
  };

  const styledDayCell = <C extends DayCell>(cell: C): C =>
    styledCell(cell, cell.isToday, !cell.isInViewMonth);

  const styledMonthCell = <C extends MonthCell>(cell: C): C =>
    styledCell(cell, cell.isCurrentMonth, false);

  const styledYearCell = <C extends YearCell>(cell: C): C =>
    styledCell(cell, cell.isCurrentYear, false);

  const styledRow = <R extends Row>(
    row: R,
    pick: (styles: Styles) => PartStyle<State> | undefined,
  ): R => ({ ...row, attributes: appendChildClass(row.attributes, part(pick)) });

  const root = appendChildClass(
    reads.root,
    part((s) => s.root),
  );

  const grid = appendChildClass(
    reads.grid,
    part((s) => s.grid),
  );

  return Match.valueTags(attributes, {
    Days: (days) => {
      const modeReads: AttributeReads["DaysAttributes"] = days;

      return {
        ...days,
        root,
        grid,
        previousMonthButton: appendChildClass(
          modeReads.previousMonthButton,
          part((s) => s.previousMonthButton),
        ),
        nextMonthButton: appendChildClass(
          modeReads.nextMonthButton,
          part((s) => s.nextMonthButton),
        ),
        headingButton: appendChildClass(
          modeReads.headingButton,
          part((s) => s.headingButton),
        ),
        headerRow: appendChildClass(
          modeReads.headerRow,
          part((s) => s.headerRow),
        ),
        columnHeaders: days.columnHeaders.map((header) => styledRow(header, (s) => s.columnHeader)),
        weeks: days.weeks.map((week) => ({
          ...styledRow(week, (s) => s.week),
          cells: week.cells.map(styledDayCell),
        })),
      };
    },
    Months: (months) => {
      const modeReads: AttributeReads["MonthsAttributes"] = months;

      return {
        ...months,
        root,
        grid,
        headingButton: appendChildClass(
          modeReads.headingButton,
          part((s) => s.headingButton),
        ),
        cells: months.cells.map(styledMonthCell),
      };
    },
    Years: (years) => {
      const modeReads: AttributeReads["YearsAttributes"] = years;

      return {
        ...years,
        root,
        grid,
        previousPageButton: appendChildClass(
          modeReads.previousPageButton,
          part((s) => s.previousPageButton),
        ),
        nextPageButton: appendChildClass(
          modeReads.nextPageButton,
          part((s) => s.nextPageButton),
        ),
        cells: years.cells.map(styledYearCell),
      };
    },
  });
};
