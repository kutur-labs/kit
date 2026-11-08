import type { DragAndDropStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, radius, shadow, size, space } from "./tokens.stylex.ts";

// The draggable item and the pointer ghost look alike, so the ghost reads as the item lifted.
const item = {
  display: "flex",
  alignItems: "center",
  gap: space.sm,
  minBlockSize: size.target,
  paddingInline: space.md,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: color.border,
  borderRadius: radius.control,
  backgroundColor: color.surface,
  color: color.text,
  fontSize: fontSize.md,
} as const;

const styles = stylex.create({
  draggable: { ...item, cursor: "grab" },
  // While an item is dragged, the pointer keeps the grabbing cursor over every other item.
  dragging: { cursor: "grabbing" },
  // The dragged item, where the app still renders it: in place while dragged by keyboard.
  dragged: { borderColor: color.accent, backgroundColor: color.hover },
});

/**
 * The look of a DragAndDrop draggable: an outlined item that turns to the accent while dragged.
 * Style the lists, the drop placeholder and the pointer ghost with `dragAndDropList`.
 */
export const dragAndDropTheme = {
  draggable: (state) => [
    styles.draggable,
    base.focusRing,
    state.isDragging && styles.dragging,
    state.isDragged && styles.dragged,
  ],
} satisfies DragAndDropStyle.Styles;

/**
 * The elements you render around the draggables:
 * - the droppable list: `sx(dragAndDropList.list, isTarget && dragAndDropList.target)`, with
 *   `isTarget` from `DragAndDrop.maybeDropTarget(model)`;
 * - the gap where a pointer drop would put the item: `sx(dragAndDropList.placeholder)`;
 * - the pointer ghost: `h.Style(ghostStyle)` from `DragAndDrop.ghostStyle(model)`, then
 *   `sx(dragAndDropList.ghost)`.
 */
export const dragAndDropList = stylex.create({
  list: {
    display: "grid",
    alignContent: "start",
    gap: space.xs,
    minBlockSize: "8rem",
    padding: space.sm,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "transparent",
    borderRadius: radius.panel,
    backgroundColor: color.hover,
  },
  target: { borderColor: color.accent },
  placeholder: {
    minBlockSize: size.target,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.accent,
    borderRadius: radius.control,
  },
  ghost: { ...item, borderColor: color.accent, boxShadow: shadow.panel, cursor: "grabbing" },
});
