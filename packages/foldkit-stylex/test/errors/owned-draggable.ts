// expect: "@foldkit/ui sets userSelect inline on this part. Dragging by pointer and touch relies on it; style the element's look."
import { DragAndDrop } from "@foldkit/ui";
import { DragAndDropStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ card: { padding: 12 }, selectable: { userSelect: "text" } });

export const x = DragAndDropStyle.draggable(DragAndDrop.draggable, {
  draggable: (state) => [styles.card, state.isDragged && styles.selectable],
});
