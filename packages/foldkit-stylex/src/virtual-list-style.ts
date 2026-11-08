import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type { Layers, StatelessPart } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { VirtualList } from "@foldkit/ui";

import { defineView, type View } from "foldkit/submodel";

import { staticPartsOf } from "./internal/part.ts";
import { sxClassName } from "./sx.ts";

/** Styles for a VirtualList. @foldkit/ui sets no `data-*` attribute that reflects its state. */
export interface Styles {
  /**
   * The scrolling `<ul>`. @foldkit/ui makes it scroll and drops its list style, margin and padding
   * inline; give it a bounded height so it scrolls.
   */
  readonly container?: StatelessPart;
  readonly row?: "VirtualList's rows take no class: style the element itemToView returns, which fills its row.";
}

/** Class name inputs this package fills, typed as the message their misuse prints. */
type Filled = FilledFromStyles<{ containerClassName: "container" }>;

// Everything this module reads from or writes to @foldkit/ui's VirtualList. `Supported` checks
// that the installed @foldkit/ui still has it.
type Reads = Readonly<{ ViewInputs: ClassNames<Filled> }>;

type Has = Readonly<{ ViewInputs: VirtualList.ViewInputs<unknown> }>;

/** `VirtualList.ViewInputs` without the container's class name, which comes from `styles`. */
export type ViewInputs<Item> = VirtualList.ViewInputs<Item> & Filled;

/**
 * A `VirtualList.view<Item>()` view with the container's styles; pass it to `h.submodel` as `view`.
 * Pass several styles objects to layer them: later ones win property by property.
 */
export const view = <Item, const List extends ReadonlyArray<Styles>>(
  virtualListView: Supported<
    "VirtualList",
    Has,
    Reads,
    View<VirtualList.Model, VirtualList.Message, VirtualList.ViewInputs<Item>>
  >,
  ...layers: Layers<List, Styles, "VirtualList">
): View<VirtualList.Model, VirtualList.Message, ViewInputs<Item>> =>
  defineView<VirtualList.Model, VirtualList.Message, ViewInputs<Item>>((model, inputs, h) =>
    virtualListView(
      model,
      { ...inputs, containerClassName: sxClassName(staticPartsOf(layers)((s) => s.container)) },
      h,
    ),
  );
