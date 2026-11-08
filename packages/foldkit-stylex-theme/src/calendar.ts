import type { CalendarStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, radius, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // As wide as seven day cells in every grid, so the calendar keeps its width as it switches.
  root: {
    display: "grid",
    gap: space.sm,
    inlineSize: `calc(7 * ${size.target} + 6 * ${space.xs})`,
  },
  // A size.target square whose rounded corners a pointer misses; base.hitArea fills them in.
  navButton: { position: "relative", paddingInline: 0 },
  headingButton: {
    flexGrow: 1,
    borderColor: "transparent",
    backgroundColor: { default: "transparent", ":hover": color.hover },
    fontWeight: 600,
  },
  // The grid keeps DOM focus while the cursor moves, so the cursor cell shows focus instead.
  grid: { display: "grid", gap: space.xs, outlineStyle: "none" },
  // Months and years: three columns, the step @foldkit/ui's up and down keys move by.
  pickerGrid: { gridTemplateColumns: "repeat(3, 1fr)" },
  row: { display: "grid", gridTemplateColumns: `repeat(7, ${size.target})`, gap: space.xs },
  columnHeader: {
    paddingBlock: space.xs,
    color: color.muted,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  cell: { display: "grid" },
  // Rounded like navButton, so it takes base.hitArea too.
  cellButton: {
    position: "relative",
    minInlineSize: size.target,
    minBlockSize: size.target,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: radius.control,
    backgroundColor: { default: "transparent", ":hover": color.hover },
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
  },
  today: { borderColor: color.accent, fontWeight: 600 },
  outsideMonth: { color: color.muted },
  selected: { backgroundColor: color.accent, color: color.onAccent },
  // base.focusRing's ring, drawn from state: the cell never has DOM focus itself.
  focused: {
    outlineColor: color.focus,
    outlineOffset: 2,
    outlineStyle: "solid",
    outlineWidth: 2,
  },
});

const navButton = [base.button, base.quietButton, base.focusRing, base.hitArea, styles.navButton];

/**
 * The look of a Calendar: quiet month and year buttons over a grid of 44px cells, today outlined
 * in the accent color and the selected date filled with it. `datePickerTheme` reuses it.
 */
export const calendarTheme = {
  root: styles.root,
  previousMonthButton: navButton,
  nextMonthButton: navButton,
  previousPageButton: navButton,
  nextPageButton: navButton,
  headingButton: [base.button, base.focusRing, styles.headingButton],
  grid: (state) => [styles.grid, state.viewMode !== "Days" && styles.pickerGrid],
  headerRow: styles.row,
  columnHeader: styles.columnHeader,
  week: styles.row,
  cell: styles.cell,
  cellButton: (state) => [
    base.hitArea,
    styles.cellButton,
    state.isToday && styles.today,
    state.isOutsideMonth && styles.outsideMonth,
    state.isSelected && styles.selected,
    state.isFocused && styles.focused,
    state.isDisabled && base.disabled,
  ],
} satisfies CalendarStyle.Styles;

/**
 * Elements you render around the grid. The row of navigation buttons and the heading:
 * `sx(calendarHeader.bar)`. The heading text, which the year grid shows without a button:
 * `sx(calendarHeader.title)`.
 */
export const calendarHeader = stylex.create({
  bar: { display: "flex", alignItems: "center", gap: space.xs },
  title: { flexGrow: 1, fontSize: fontSize.md, fontWeight: 600, textAlign: "center" },
});
