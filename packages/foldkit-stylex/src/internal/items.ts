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

/**
 * What a component's `Reads` lists of the callbacks this package wraps: that the view inputs still
 * take them, with the arguments this package passes on, and that @foldkit/ui still accepts the
 * config of an item and a heading this package returns. Each component adds the `ItemContext` its
 * item state reads.
 */
export type CallbackReads = Readonly<{
  ViewInputs: Readonly<{
    // What these pass and return is checked under ItemContext, ItemConfig and GroupHeading.
    itemToConfig: (item: never, context: never) => object;
    groupToHeading?: (groupKey: string) => object | undefined;
  }>;
  ItemConfig: Readonly<{ accepts: true }>;
  GroupHeading: Readonly<{ accepts: true }>;
}>;

// The config of an item or a heading, as `styledCallbacks` returns it: the app's content and the
// part's class.
type Written = Readonly<{ content: Html; className: string }>;

/**
 * What @foldkit/ui has, under the names `Reads` uses: the component's model and view inputs, the
 * context its `itemToConfig` input passes, and whether the configs its `itemToConfig` and
 * `groupToHeading` inputs return still take the one this package returns. Comparing whole configs
 * fails on a field @foldkit/ui newly requires and passes a widened one. Read without a constraint
 * on `Inputs`, so a renamed callback fails `Supported` as `ViewInputs.itemToConfig` only: the
 * sections that read it are `never` then.
 */
export type Has<Model, Inputs> = Readonly<{
  Model: Model;
  ViewInputs: Inputs;
  ItemContext: Inputs extends Readonly<{
    itemToConfig: (item: never, context: infer Context) => object;
  }>
    ? Context
    : never;
  ItemConfig: Readonly<{
    accepts: Inputs extends Readonly<{
      itemToConfig: (item: never, context: never) => infer Config;
    }>
      ? Written extends Config
        ? true
        : false
      : never;
  }>;
  GroupHeading: Readonly<{
    accepts: Inputs extends Readonly<{ groupToHeading?: infer GroupToHeading }>
      ? GroupToHeading extends (groupKey: string) => infer Heading
        ? Written extends Heading
          ? true
          : false
        : never
      : never;
  }>;
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
  itemToConfig: (item: Item, itemState: ItemState): Written => ({
    content: callbacks.itemToConfig(item, itemState).content,
    className: sxClassName(partsOf(layers, itemState)((styles) => styles.item)),
  }),
  groupToHeading: (groupKey: string) =>
    Option.match(Option.fromUndefinedOr(callbacks.groupToHeading?.(groupKey)), {
      onNone: () => undefined,
      onSome: ({ content }): Written => ({
        content,
        className: sxClassName(partsOf(layers, state)((styles) => styles.heading)),
      }),
    }),
});
