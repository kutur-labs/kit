import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { DragAndDrop } from "@kutur-kit/foldkit-stylex-theme/drag-and-drop";
import { color, fontSize, fontWeight, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Option, Predicate, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Reorders items within and between lists, by pointer or keyboard.";

const Item = Schema.Struct({ id: Schema.String, label: Schema.String });

type Item = typeof Item.Type;

const List = Schema.Struct({ id: Schema.String, label: Schema.String, items: Schema.Array(Item) });

type List = typeof List.Type;

export const Model = Schema.Struct({ dragAndDrop: DragAndDrop.Model, lists: Schema.Array(List) });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDrop.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    dragAndDrop: DragAndDrop.init({ id: "tasks" }),
    lists: [
      {
        id: "to-do",
        label: "To do",
        items: [
          { id: "brief", label: "Write the brief" },
          { id: "cover", label: "Draw the cover" },
          { id: "print", label: "Print the pages" },
        ],
      },
      { id: "done", label: "Done", items: [{ id: "paper", label: "Buy paper" }] },
    ],
  },
});

const itemOf = (lists: ReadonlyArray<List>, itemId: string) =>
  Array.findFirst(
    lists.flatMap(({ items }) => items),
    ({ id }) => id === itemId,
  );

// Moves a dropped item to its new place. A list of another demo on the page, which the keyboard can
// reach, leaves the lists as they were.
const moved = (
  lists: ReadonlyArray<List>,
  {
    itemId,
    toContainerId,
    toIndex,
  }: Readonly<{ itemId: string; toContainerId: string; toIndex: number }>,
): ReadonlyArray<List> =>
  Option.match(itemOf(lists, itemId), {
    onNone: () => lists,
    onSome: (item) =>
      lists.some(({ id }) => id === toContainerId)
        ? lists.map((list) => {
            const rest = list.items.filter(({ id }) => id !== itemId);

            return {
              ...list,
              items:
                list.id === toContainerId
                  ? Array.insertAt(rest, toIndex, item).pipe(
                      Option.getOrElse(() => [...rest, item]),
                    )
                  : rest,
            };
          })
        : lists,
  });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDragAndDropMessage: ({ message }) => {
      const next = DragAndDrop.update(model.dragAndDrop, message);

      return {
        model: {
          dragAndDrop: next.model,
          lists: Predicate.isTagged(next.outMessage, "Reordered")
            ? moved(model.lists, next.outMessage)
            : model.lists,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotDragAndDropMessage({ message }),
        ),
      };
    },
  });

// Pointer moves, Escape and the keyboard drag's arrow keys happen outside the items.
export const subscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  read: (model) => Option.some(model.dragAndDrop),
  toParentMessage: (message) => Message.GotDragAndDropMessage({ message }),
});

const draggedItem = ({ dragAndDrop, lists }: Model) =>
  DragAndDrop.isDragging(dragAndDrop)
    ? Option.flatMap(DragAndDrop.maybeDraggedItemId(dragAndDrop), (id) => itemOf(lists, id))
    : Option.none();

// What a list shows during a drag: the dragged item leaves its place, and the list under the drop
// target shows the item there when moved by keyboard, or a placeholder (none) under the pointer.
const slotsOf = (list: List, model: Model): ReadonlyArray<Option.Option<Item>> => {
  const dragged = draggedItem(model);

  const rest = list.items
    .filter((item) => !Option.exists(dragged, ({ id }) => id === item.id))
    .map(Option.some);

  const inserted = Predicate.isTagged(model.dragAndDrop.dragState, "KeyboardDragging")
    ? dragged
    : Option.none();

  return Option.match(
    Option.filter(
      DragAndDrop.maybeDropTarget(model.dragAndDrop),
      ({ containerId }) => containerId === list.id,
    ),
    {
      onNone: () => rest,
      onSome: ({ index }) =>
        Array.insertAt(rest, index, inserted).pipe(Option.getOrElse(() => [...rest, inserted])),
    },
  );
};

const styles = stylex.create({
  board: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 14rem))", gap: space.md },
  heading: {
    display: "flex",
    gap: space.sm,
    margin: 0,
    paddingInline: space.xs,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: "1.125rem",
  },
  // Its digits keep one width as items move in and out.
  count: { color: color.muted, fontVariantNumeric: "tabular-nums" },
  list: { marginBlockStart: space.sm },
});

const listView = (list: List, model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.h2(
        [sx(styles.heading)],
        [list.label, h.span([sx(styles.count)], [String(list.items.length)])],
      ),
      h.div(
        [
          ...DragAndDrop.droppable(list.id, list.label),
          sx(
            DragAndDrop.list.body,
            styles.list,
            Option.exists(
              DragAndDrop.maybeDropTarget(model.dragAndDrop),
              ({ containerId }) => containerId === list.id,
            ) && DragAndDrop.list.target,
          ),
        ],
        slotsOf(list, model).map((slot, index) =>
          Option.match(slot, {
            onNone: () => h.keyed("div")("placeholder", [sx(DragAndDrop.list.placeholder)], []),
            onSome: (item) =>
              h.keyed("div")(
                item.id,
                DragAndDrop.draggable(
                  {
                    model: model.dragAndDrop,
                    toParentMessage: (message) => Message.GotDragAndDropMessage({ message }),
                    itemId: item.id,
                    containerId: list.id,
                    index,
                  },
                  h,
                ),
                [item.label],
              ),
          }),
        ),
      ),
    ],
  );

const ghostView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(
    Option.all({ style: DragAndDrop.ghostStyle(model.dragAndDrop), item: draggedItem(model) }),
    {
      onNone: () => h.empty,
      onSome: ({ style, item }) =>
        h.div([h.Style(style), sx(DragAndDrop.list.ghost)], [item.label]),
    },
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.board)],
    [...model.lists.map((list) => listView(list, model, h)), ghostView(model, h)],
  );
