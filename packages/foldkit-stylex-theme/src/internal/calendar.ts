// @foldkit/ui's Calendar with `view` themed, plus `restyle`, the arrows and the header's layout.
import * as Core from "@foldkit/ui/calendar";
import { CalendarStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { fontSize, fontWeight, lineHeight, space } from "../tokens.stylex.ts";
import { theme } from "./calendar-theme.ts";
import { next, previous } from "./marks.ts";

export * from "@foldkit/ui/calendar";

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = CalendarStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: CalendarStyle.Layers<List, [typeof theme]>
) => ({ view: CalendarStyle.view(Core.view, theme, ...layers) });

/** `Calendar.view`, styled by the theme. */
export const { view } = restyle();

/**
 * Elements you render around the grid. The row of arrows and the heading: `sx(Calendar.header.bar)`.
 * The heading text, which the year grid shows without a button: `sx(Calendar.header.title)`.
 */
export const header = stylex.create({
  bar: { display: "flex", alignItems: "center", gap: space.xs },
  // Set as the heading button's label, which base.button draws.
  title: {
    flexGrow: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    textAlign: "center",
  },
});

/** The arrow of `previousMonthButton` and `previousPageButton`, pointing back in the reading direction. */
export const previousIcon = previous;

/** The arrow of `nextMonthButton` and `nextPageButton`, pointing forward in the reading direction. */
export const nextIcon = next;
