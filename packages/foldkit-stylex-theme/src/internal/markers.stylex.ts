// First, so the compile guard runs before the marker is defined.
import "./compiled.ts";
import * as stylex from "@stylexjs/stylex";

/** On every list panel, so its active item can show the panel's keyboard focus. */
export const listItems = stylex.defineMarker();

/** On a calendar's grid, so its cursor cell can show the grid's keyboard focus. */
export const calendarGrid = stylex.defineMarker();
