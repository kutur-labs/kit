// @foldkit/ui's DragAndDrop with `draggable` themed, plus `restyle` and the styles of the elements
// around the draggables.
import * as Core from "@foldkit/ui/dragAndDrop";
import { DragAndDropStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, lineHeight, radius, shadow, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/dragAndDrop";

// A card on the list's subtle well, raised by a hairline and shadow.control. A dark scheme shows
// height by lightness rather than shadow, so there the card takes the next grey above the well's.
const item = {
  display: "flex",
  alignItems: "center",
  gap: space.sm,
  minBlockSize: size.control,
  paddingInline: space.md,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: color.border,
  borderRadius: radius.control,
  backgroundColor: `light-dark(${color.surface}, ${color.border})`,
  boxShadow: shadow.control,
  color: color.text,
  fontSize: fontSize.md,
  lineHeight: lineHeight.md,
} as const;

// An item being moved, by keyboard in place or as the pointer's ghost, lifts off the list:
// shadow.panel's ring becomes its edge, as a panel's. Forced colors drop shadows, so there the edge
// turns Highlight to keep the state.
const lifted = {
  borderColor: { default: "transparent", "@media (forced-colors: active)": "Highlight" },
  boxShadow: shadow.panel,
} as const;

const styles = stylex.create({
  draggable: { ...item, cursor: "grab" },
  // While an item is dragged, the pointer keeps the grabbing cursor over every other item.
  dragging: { cursor: "grabbing" },
  // The dragged item, where the app still renders it: in place while dragged by keyboard.
  dragged: lifted,
});

// A raised card that lifts while dragged.
const theme = {
  draggable: (state) => [
    styles.draggable,
    base.focusRing,
    state.isDragging && styles.dragging,
    state.isDragged && styles.dragged,
  ],
} satisfies DragAndDropStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = DragAndDropStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: DragAndDropStyle.Layers<List, [typeof theme]>
) => ({ draggable: DragAndDropStyle.draggable(Core.draggable, theme, ...layers) });

/** `DragAndDrop.draggable`, its attributes styled by the theme. */
export const { draggable } = restyle();

/**
 * The elements you render around the draggables:
 * - the droppable list, after `droppable`'s attributes:
 *   `sx(DragAndDrop.list.body, isTarget && DragAndDrop.list.target)`, with `isTarget` from
 *   `DragAndDrop.maybeDropTarget(model)`;
 * - the gap where a pointer drop would put the item: `sx(DragAndDrop.list.placeholder)`;
 * - the pointer ghost: `h.Style` from `DragAndDrop.ghostStyle(model)`, then
 *   `sx(DragAndDrop.list.ghost)`.
 */
export const list = stylex.create({
  body: {
    display: "grid",
    alignContent: "start",
    gap: space.xs,
    // Grows with its items; empty, it keeps room for one, so it stays a place to drop.
    minBlockSize: `calc(${size.control} + 2 * ${space.xs} + 2px)`,
    padding: space.xs,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: radius.panel,
    backgroundColor: color.subtle,
  },
  // color.control, the 3:1 of WCAG 1.4.11, rather than the accent, which stays for focus.
  target: { borderColor: color.control },
  // Dashed, so the gap reads as a place for the item rather than an item.
  placeholder: {
    minBlockSize: size.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.control,
    borderRadius: radius.control,
  },
  ghost: { ...item, ...lifted, cursor: "grabbing" },
});
