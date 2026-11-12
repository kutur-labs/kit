// The Calendar look, apart from the namespace because Calendar and DatePicker's panel both draw it.
import type { CalendarStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { calendarGrid } from "./markers.stylex.ts";

const styles = stylex.create({
  // As wide as seven day cells in every grid, so the calendar keeps its width as it switches.
  root: { display: "grid", gap: space.sm, inlineSize: `calc(7 * ${size.control})` },
  // One line, so the arrows stay put as the month's name changes length.
  headingButton: { flexGrow: 1, color: color.text, whiteSpace: "nowrap" },
  // The grid keeps DOM focus while the cursor moves, so the cursor cell shows focus instead.
  grid: { display: "grid", outlineStyle: "none" },
  // Months and years: three columns, the step @foldkit/ui's up and down keys move by, spaced as
  // far apart as the arrows from the heading.
  pickerGrid: { gridTemplateColumns: "repeat(3, 1fr)", gap: space.xs },
  row: { display: "grid", gridTemplateColumns: `repeat(7, ${size.control})` },
  columnHeader: {
    paddingBlockEnd: space.xs,
    color: color.muted,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    textAlign: "center",
  },
  cell: { display: "grid" },
  // Positioned for base.hitArea, which fills in the corners its radius takes from the pointer.
  cellButton: {
    position: "relative",
    minInlineSize: size.control,
    minBlockSize: size.control,
    padding: 0,
    borderStyle: "none",
    borderRadius: radius.control,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, "@media (hover: hover)": color.subtle },
    },
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    transitionProperty: "background-color",
  },
  // The fill marks today; the weight tells it apart from a hovered day. A day filled at rest takes
  // no fill transition, which a scheme switch would run.
  today: { backgroundColor: color.subtle, fontWeight: fontWeight.medium, transitionDuration: "0s" },
  outsideMonth: { color: color.muted },
  selected: { backgroundColor: color.accent, color: color.onAccent, transitionDuration: "0s" },
  // base.focusRing's ring on the cursor cell while the grid has focus, which the cell never has
  // itself. Only while the grid shows keyboard focus: @foldkit/ui also focuses the grid when the
  // pointer opens a date picker or switches to months or years. It takes base.focusRing's color,
  // offset and width, and replaces its outlineStyle, so it keeps the ring for a cursor cell that
  // has keyboard focus itself.
  focused: {
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
      [stylex.when.ancestor(":focus-visible", calendarGrid)]: "solid",
    },
  },
  // Forced colors flatten the dimming, so there a disabled day is struck through to differ from
  // another month's day. Elsewhere a row of struck-through days reads as an alarm.
  disabled: {
    textDecorationLine: { default: null, "@media (forced-colors: active)": "line-through" },
  },
});

// Square, quiet and holding one mark, with base.hitArea for the corners its radius rounds off.
const navigationButton = [
  base.button,
  base.iconButton,
  base.quietButton,
  base.focusRing,
  base.hitArea,
];

/**
 * Quiet arrows and heading over a grid of size.control cells, today filled and the selection in
 * the accent.
 */
export const theme = {
  root: styles.root,
  previousMonthButton: navigationButton,
  nextMonthButton: navigationButton,
  previousPageButton: navigationButton,
  nextPageButton: navigationButton,
  headingButton: [base.button, base.quietButton, base.focusRing, styles.headingButton],
  grid: (state) => [styles.grid, calendarGrid, state.viewMode !== "Days" && styles.pickerGrid],
  headerRow: styles.row,
  columnHeader: styles.columnHeader,
  week: styles.row,
  cell: styles.cell,
  // base.focusRing for a cell that takes DOM focus anyway: a day keeps it after a click.
  cellButton: (state) => [
    base.hitArea,
    styles.cellButton,
    base.highlight,
    base.focusRing,
    state.isToday && styles.today,
    state.isOutsideMonth && styles.outsideMonth,
    state.isSelected && [styles.selected, base.systemColors],
    state.isFocused && styles.focused,
    state.isDisabled && [base.disabledButton, styles.disabled],
  ],
} satisfies CalendarStyle.Styles;
