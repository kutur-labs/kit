import type { Html, HtmlBuilder } from "foldkit/html";

import { DragAndDrop } from "@foldkit/ui";
import { DragAndDropStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotBoardMessage: { message: DragAndDrop.Message } });

type Message = typeof Message.Type;

const styles = stylex.create({
  list: { display: "grid", gap: 8 },
  card: { minBlockSize: 44, padding: 12, cursor: "grab" },
  dragging: { cursor: "grabbing" },
  dragged: { opacity: 0.4 },
  ghost: { padding: 12, backgroundColor: "white", color: "black" },
});

const draggable = DragAndDropStyle.draggable(DragAndDrop.draggable, {
  draggable: (state) => [
    styles.card,
    state.isDragging && styles.dragging,
    state.isDragged && styles.dragged,
  ],
});

// The parent's Message comes from `toParentMessage` and `h`, as with DragAndDrop.draggable.
export const board = (
  model: DragAndDrop.Model,
  cards: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [],
    [
      h.ul(
        [...DragAndDrop.droppable("cards", "Karty"), sx(styles.list)],
        cards.map((card, index) =>
          h.li(
            draggable(
              {
                model,
                toParentMessage: (message) => Message.GotBoardMessage({ message }),
                itemId: card,
                containerId: "cards",
                index,
              },
              h,
            ),
            [card],
          ),
        ),
      ),
      ...Option.match(DragAndDrop.ghostStyle(model), {
        onNone: () => [],
        onSome: (ghost) => [h.div([h.Style(ghost), sx(styles.ghost)], ["…"])],
      }),
    ],
  );
