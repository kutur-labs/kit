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

/**
 * Everything the calendar's parts and cell state read from the attributes `toView` gets.
 * `Supported` checks that the installed @foldkit/ui still has them, and `Attributes._tag` that it
 * has no view mode this package does not style.
 */
export type Reads = Readonly<{
  Attributes: Readonly<{ _tag: "Days" | "Months" | "Years" }>;
  DaysAttributes: Readonly<
    Record<
      "root" | "previousMonthButton" | "nextMonthButton" | "headingButton" | "grid" | "headerRow",
      Bundle
    > & {
      columnHeaders: ReadonlyArray<Readonly<{ attributes: Bundle }>>;
      weeks: ReadonlyArray<
        Readonly<{
          attributes: Bundle;
          cells: ReadonlyArray<Cell & Readonly<{ isToday: boolean; isInViewMonth: boolean }>>;
        }>
      >;
    }
  >;
  MonthsAttributes: Readonly<
    Record<"root" | "headingButton" | "grid", Bundle> & {
      cells: ReadonlyArray<Cell & Readonly<{ isCurrentMonth: boolean }>>;
    }
  >;
  YearsAttributes: Readonly<
    Record<"root" | "previousPageButton" | "nextPageButton" | "grid", Bundle> & {
      cells: ReadonlyArray<Cell & Readonly<{ isCurrentYear: boolean }>>;
    }
  >;
}>;

/** The @foldkit/ui types `Reads` is checked against, under the same names. */
export type Has = Readonly<{
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
  const state: State = { viewMode: attributes._tag };
  const part = partsOf(layers, state);

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

  const root = appendChildClass(
    attributes.root,
    part((s) => s.root),
  );

  const grid = appendChildClass(
    attributes.grid,
    part((s) => s.grid),
  );

  return Match.valueTags(attributes, {
    Days: (days) => ({
      ...days,
      root,
      grid,
      previousMonthButton: appendChildClass(
        days.previousMonthButton,
        part((s) => s.previousMonthButton),
      ),
      nextMonthButton: appendChildClass(
        days.nextMonthButton,
        part((s) => s.nextMonthButton),
      ),
      headingButton: appendChildClass(
        days.headingButton,
        part((s) => s.headingButton),
      ),
      headerRow: appendChildClass(
        days.headerRow,
        part((s) => s.headerRow),
      ),
      columnHeaders: days.columnHeaders.map((header) => ({
        ...header,
        attributes: appendChildClass(
          header.attributes,
          part((s) => s.columnHeader),
        ),
      })),
      weeks: days.weeks.map((week) => ({
        ...week,
        attributes: appendChildClass(
          week.attributes,
          part((s) => s.week),
        ),
        cells: week.cells.map((cell) => styledCell(cell, cell.isToday, !cell.isInViewMonth)),
      })),
    }),
    Months: (months) => ({
      ...months,
      root,
      grid,
      headingButton: appendChildClass(
        months.headingButton,
        part((s) => s.headingButton),
      ),
      cells: months.cells.map((cell) => styledCell(cell, cell.isCurrentMonth, false)),
    }),
    Years: (years) => ({
      ...years,
      root,
      grid,
      previousPageButton: appendChildClass(
        years.previousPageButton,
        part((s) => s.previousPageButton),
      ),
      nextPageButton: appendChildClass(
        years.nextPageButton,
        part((s) => s.nextPageButton),
      ),
      cells: years.cells.map((cell) => styledCell(cell, cell.isCurrentYear, false)),
    }),
  });
};
