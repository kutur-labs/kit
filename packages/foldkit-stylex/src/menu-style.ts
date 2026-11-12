import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type { CallbackReads, Callbacks, Has } from "./internal/items.ts";
import type { Supported } from "./internal/supported.ts";
import type { Menu } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { anchored } from "./internal/functional-styles.ts";
import { styledCallbacks } from "./internal/items.ts";
import { partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";
import { visibilityOf, type TransitionState } from "./internal/transition.ts";
import { sxClassName } from "./sx.ts";

/** A menu's state, the same for each part but `item`. */
export interface State {
  /**
   * The items are rendered: open, or playing their leave animation. @foldkit/ui sets `data-open`
   * on the wrapper and the button then. For a fade, style `isClosed`: this stays true while the
   * items leave.
   */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed` on `items`: the first frame of the enter animation
   * and the leave animation. Put `transition*` on the base style and the closed values here.
   */
  readonly isClosed: boolean;
  /** The `isButtonDisabled` input, which @foldkit/ui marks on the button with `data-disabled`. */
  readonly isButtonDisabled: boolean;
}

/** An item's state, as @foldkit/ui passes it to `itemToConfig`. */
export interface ItemState {
  /** The highlighted item, which @foldkit/ui marks with `data-active`. */
  readonly isActive: boolean;
  /** An item `isItemDisabled` returns true for, which @foldkit/ui marks with `data-disabled`. */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Menu. */
export interface Styles {
  /** The positioned element around the button. */
  readonly wrapper?: PartStyle<State>;
  /** @foldkit/ui lifts it to `position: relative; z-index: 1` while the menu is open. */
  readonly button?: PartStyle<State>;
  /** Covers the viewport while open, to catch outside clicks; style its color and opacity. */
  readonly backdrop?: PartStyle<State>;
  /**
   * The floating panel. Floating UI positions it and caps its height; cap the list on
   * `itemsScroll`. It renders outside your view, so set `color`.
   */
  readonly items?: PartStyle<State>;
  /** A scroll container inside the panel; @foldkit/ui renders it only when this part is styled. */
  readonly itemsScroll?: PartStyle<State>;
  /** Each item, a `menuitem` around the content `itemToConfig` returns. */
  readonly item?: PartStyle<ItemState>;
  /** A run of items with the same `itemGroupKey`; @foldkit/ui renders groups only with that input. */
  readonly group?: PartStyle<State>;
  /** The heading `groupToHeading` returns content for. */
  readonly heading?: PartStyle<State>;
  /** A separator between groups; @foldkit/ui renders it only when this part is styled. */
  readonly separator?: PartStyle<State>;
  readonly panel?: "Menu calls its panel items: put these styles under items.";
}

// Class name inputs this package fills, typed as the message their misuse prints.
type Filled = FilledFromStyles<{
  className: "wrapper";
  buttonClassName: "button";
  backdropClassName: "backdrop";
  itemsClassName: "items";
  itemsScrollClassName: "itemsScroll";
  groupClassName: "group";
  separatorClassName: "separator";
}>;

// Everything this module reads from @foldkit/ui's Menu. `styledInputs` touches only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = CallbackReads &
  Readonly<{
    Model: Readonly<{
      isOpen: boolean;
      animation: Readonly<{ transitionState: TransitionState }>;
    }>;
    ViewInputs: ClassNames<Filled> & Readonly<{ isButtonDisabled?: boolean }>;
    ItemContext: ItemState;
  }>;

/** `Menu.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs<Item extends string> = Menu.ViewInputs<Item> &
  Callbacks<Item, ItemState> &
  Filled;

// The view inputs @foldkit/ui gets: class names from `styles`, item callbacks wrapped.
const styledInputs = <Item>(
  layers: ReadonlyArray<Styles>,
  model: Reads["Model"],
  inputs: Reads["ViewInputs"] & Callbacks<Item, ItemState>,
) => {
  const state: State = {
    ...visibilityOf(model.isOpen, model.animation.transitionState),
    isButtonDisabled: inputs.isButtonDisabled ?? false,
  };

  const part = partsOf(layers, state);

  return {
    className: sxClassName(
      anchored.wrapper,
      part((s) => s.wrapper),
    ),
    buttonClassName: sxClassName(part((s) => s.button)),
    backdropClassName: sxClassName(
      anchored.backdrop,
      part((s) => s.backdrop),
    ),
    itemsClassName: sxClassName(
      anchored.panel,
      part((s) => s.items),
    ),
    // "" when unstyled, which @foldkit/ui reads as absent and renders no element for.
    itemsScrollClassName: sxClassName(part((s) => s.itemsScroll)),
    separatorClassName: sxClassName(part((s) => s.separator)),
    groupClassName: sxClassName(part((s) => s.group)),
    ...styledCallbacks(layers, state, inputs),
  };
};

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Menu", Before>;

/**
 * A `Menu.create` view with each part's styles; pass it to `h.submodel` as `view`. Pass several
 * styles objects to layer them: later ones win property by property.
 */
export const view = <Item extends string, const List extends ReadonlyArray<Styles>>(
  menuView: Supported<
    "Menu",
    Has<Menu.Model, Menu.ViewInputs<string>>,
    Reads,
    (model: Menu.Model, inputs: Menu.ViewInputs<Item>, h: HtmlBuilder<Menu.Message>) => Html
  >,
  ...layers: Layers<List>
): View<Menu.Model, Menu.Message, ViewInputs<Item>> =>
  defineView<Menu.Model, Menu.Message, ViewInputs<Item>>((model, inputs, h) =>
    menuView(model, { ...inputs, ...styledInputs(layers, model, inputs) }, h),
  );
