// Shared by the components whose view inputs take class names and an `itemToConfig` callback:
// Listbox and Combobox, each with its Multi variant, and Menu.
import type { Html } from "foldkit/html";

import * as Option from "effect/Option";

import { sxClassName } from "../sx.ts";
import { partsOf, type PartStyle } from "./part.ts";

type ItemContent = Readonly<{
  content: Html;
  className?: "Style items through the item part of styles.";
}>;

type HeadingContent = Readonly<{
  content: Html;
  className?: "Style group headings through the heading part of styles.";
}>;

/** `itemToConfig` and `groupToHeading` without class names, which come from `styles`. */
export type Callbacks<Item, ItemState> = Readonly<{
  itemToConfig: (item: Item, state: ItemState) => ItemContent;
  groupToHeading?: (groupKey: string) => HeadingContent | undefined;
}>;

/** `groupToHeading` as @foldkit/ui takes it, for each component's `Reads`. */
export type GroupToHeading = (
  groupKey: string,
) => Readonly<{ content: Html; className?: string }> | undefined;

/**
 * What @foldkit/ui has, under the names `Reads` uses: the component's model and view inputs, and
 * the context its `itemToConfig` passes.
 */
export type Has<
  Model,
  Inputs extends Readonly<{ itemToConfig: (item: never, context: never) => object }>,
> = Readonly<{
  Model: Model;
  ViewInputs: Inputs;
  ItemContext: Parameters<Inputs["itemToConfig"]>[1];
}>;

/** The parts the callbacks style: each item from its own state, each heading from the panel's. */
export type ItemStyles<State, ItemState> = Readonly<{
  item?: PartStyle<ItemState>;
  heading?: PartStyle<State>;
}>;

/** The callbacks @foldkit/ui gets: the app's content, with the `item` and `heading` parts' classes. */
export const styledCallbacks = <Item, State, ItemState>(
  layers: ReadonlyArray<ItemStyles<State, ItemState>>,
  state: State,
  callbacks: Callbacks<Item, ItemState>,
) => ({
  itemToConfig: (item: Item, itemState: ItemState) => ({
    content: callbacks.itemToConfig(item, itemState).content,
    className: sxClassName(partsOf(layers, itemState)((styles) => styles.item)),
  }),
  groupToHeading: (groupKey: string) =>
    Option.match(Option.fromUndefinedOr(callbacks.groupToHeading?.(groupKey)), {
      onNone: () => undefined,
      onSome: ({ content }) => ({
        content,
        className: sxClassName(partsOf(layers, state)((styles) => styles.heading)),
      }),
    }),
});
