import type { Supported } from "./internal/supported.ts";
import type { DragAndDrop } from "@foldkit/ui";
import type { Attribute, HtmlBuilder } from "foldkit/html";

import * as Predicate from "effect/Predicate";

import { appendClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/**
 * A draggable's state, from the DragAndDrop model in its config. @foldkit/ui sets no `data-*`
 * attribute for either flag.
 */
export interface DraggableState {
  /**
   * Some item of this DragAndDrop is being dragged, by pointer past the activation threshold or by
   * keyboard, as `DragAndDrop.isDragging(model)` reports.
   */
  readonly isDragging: boolean;
  /**
   * This element's item is the one being dragged. A pointer press that has not yet passed the
   * activation threshold does not count, so a click does not flash the dragged style.
   */
  readonly isDragged: boolean;
}

/**
 * Styles for a DragAndDrop draggable. `droppable` and `sortable` return attributes with no style or
 * state: put `sx(...)` after them on your element. Style the pointer ghost on your own element,
 * with `h.Style` from `DragAndDrop.ghostStyle(model)` and `sx(...)`.
 */
export interface Styles {
  /**
   * The element that takes the `draggable` attributes, with `role="option"`. @foldkit/ui sets
   * `touch-action: none` and `user-select: none` on it inline, so a pointer drag neither scrolls
   * nor selects text.
   */
  readonly draggable?: PartStyle<DraggableState>;
}

type DragState =
  | Readonly<{ _tag: "Idle" }>
  | Readonly<{ _tag: "Pending" | "Dragging" | "KeyboardDragging"; itemId: string }>;

// Everything this module reads from @foldkit/ui's DragAndDrop. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ itemId: string; model: Readonly<{ dragState: DragState }> }>;
}>;

type Has = Readonly<{ Config: DragAndDrop.DraggableConfig<never> }>;

const stateOf = ({ itemId, model: { dragState } }: Reads["Config"]): DraggableState => {
  const isDragging =
    Predicate.isTagged(dragState, "Dragging") || Predicate.isTagged(dragState, "KeyboardDragging");

  return { isDragging, isDragged: isDragging && dragState.itemId === itemId };
};

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "DragAndDrop", Before>;

/**
 * `DragAndDrop.draggable` with the draggable's styles as the last attribute. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const draggable =
  <const List extends ReadonlyArray<Styles>>(
    draggableAttributes: Supported<"DragAndDrop", Has, Reads, typeof DragAndDrop.draggable>,
    ...layers: Layers<List>
  ) =>
  <ParentMessage>(
    config: DragAndDrop.DraggableConfig<ParentMessage>,
    h: HtmlBuilder<ParentMessage>,
  ): ReadonlyArray<Attribute<ParentMessage>> =>
    appendClass(
      draggableAttributes(config, h),
      partsOf(layers, stateOf(config))((s) => s.draggable),
    );
