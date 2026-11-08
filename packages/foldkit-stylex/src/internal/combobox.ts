// Styles, state and inputs shared by ComboboxStyle.view and ComboboxStyle.Multi.view.
import type { ClassNames, FilledFromStyles } from "./filled.ts";
import type { GroupToHeading } from "./items.ts";
import type * as Own from "./owned.ts";

import { sxClassName } from "../sx.ts";
import { anchored } from "./functional-styles.ts";
import { styledCallbacks, type Callbacks } from "./items.ts";
import { partsOf, type PartStyle } from "./part.ts";
import { visibilityOf } from "./transition.ts";

/** A combobox's state, the same for each part but `item`. */
export interface State {
  /**
   * The list is open, or playing its leave animation. @foldkit/ui sets `data-open` on the wrapper
   * and the input then, also while no item matches and the panel is not rendered. For a fade,
   * style `isClosed`: this stays true while the list leaves.
   */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed` on `items`: the first frame of the enter animation
   * and the leave animation. Put `transition*` on the base style and the closed values here.
   */
  readonly isClosed: boolean;
  /**
   * The `isDisabled` input. @foldkit/ui sets `data-disabled` on the wrapper, the input and the
   * button, and `aria-disabled` rather than `disabled` on the input and the button.
   */
  readonly isDisabled: boolean;
  /** The input takes focus and the list opens, but typing and selecting do nothing. */
  readonly isReadOnly: boolean;
  /** The `isInvalid` input; @foldkit/ui sets `data-invalid` on the wrapper and the input. */
  readonly isInvalid: boolean;
}

/** An item's state, as @foldkit/ui passes it to `itemToConfig`. */
export interface ItemState {
  /** The highlighted item, which @foldkit/ui marks with `data-active`. */
  readonly isActive: boolean;
  /** From `isItemDisabled`; @foldkit/ui sets `aria-disabled` and `data-disabled`. */
  readonly isDisabled: boolean;
  /** The `isReadOnly` input, the same for every item; @foldkit/ui sets `data-readonly`. */
  readonly isReadOnly: boolean;
  /** The item's value is selected; @foldkit/ui sets `data-selected`. */
  readonly isSelected: boolean;
}

/** Styles for each part of a Combobox or Combobox.Multi. */
export interface Styles {
  /**
   * The outer element, around `inputWrapper`. This package positions it, which keeps the input
   * above the backdrop.
   */
  readonly wrapper?: PartStyle<State>;
  /**
   * The element around the input and the toggle button. Floating UI anchors the panel to it and
   * gives the panel its width as `--button-width`.
   */
  readonly inputWrapper?: PartStyle<State>;
  /**
   * The `<input>`, with `role="combobox"`. It keeps focus while the list is open and points at the
   * highlighted item with `aria-activedescendant`, so style that item from `isActive`.
   */
  readonly input?: PartStyle<State>;
  /**
   * The toggle button; @foldkit/ui renders it only when `buttonContent` is set. Unlike Listbox's,
   * it stays in place while the list is open.
   */
  readonly button?: PartStyle<State>;
  /**
   * Covers the viewport while the panel is rendered, or while a modal combobox is open, to catch
   * outside clicks; style its color and opacity.
   */
  readonly backdrop?: PartStyle<State>;
  /**
   * The floating panel, rendered only while visible with at least one item. Floating UI positions
   * it and caps its height; cap the list on `itemsScroll`. It renders outside your view, so set
   * `color`.
   */
  readonly items?: PartStyle<State>;
  /** A scroll container inside the panel; @foldkit/ui renders it only when this part is styled. */
  readonly itemsScroll?: PartStyle<State>;
  /** Each option, styled from its own `ItemState`. */
  readonly item?: PartStyle<ItemState>;
  /** The element around each group of items when `itemGroupKey` is set. */
  readonly group?: PartStyle<State>;
  /** The heading `groupToHeading` returns content for. */
  readonly heading?: PartStyle<State>;
  /** A separator between groups; @foldkit/ui renders it only when this part is styled. */
  readonly separator?: PartStyle<State>;
  readonly panel?: "Combobox calls its panel items: put these styles under items.";
}

export type Owns = Readonly<{
  wrapper: Own.Wrapper;
  backdrop: Own.Backdrop;
  items: Own.AnchoredPanel;
}>;

/** Class name inputs this package fills, typed as the message their misuse prints. */
export type Filled = FilledFromStyles<{
  className: "wrapper";
  inputWrapperClassName: "inputWrapper";
  inputClassName: "input";
  buttonClassName: "button";
  backdropClassName: "backdrop";
  itemsClassName: "items";
  itemsScrollClassName: "itemsScroll";
  groupClassName: "group";
  separatorClassName: "separator";
}>;

// Everything both Combobox views read or write. `styledInputs` touches only these, and `Supported`
// checks that the installed @foldkit/ui still has them.
export type Reads = Readonly<{
  Model: Readonly<{ isOpen: boolean; animation: Readonly<{ transitionState: string }> }>;
  ViewInputs: ClassNames<Filled> &
    Readonly<{
      isDisabled?: boolean;
      isReadOnly?: boolean;
      isInvalid?: boolean;
      groupToHeading?: GroupToHeading;
    }>;
  ItemContext: ItemState;
}>;

/** The view inputs @foldkit/ui gets: class names from `styles`, item callbacks wrapped. */
export const styledInputs = <Item>(
  layers: ReadonlyArray<Styles>,
  model: Reads["Model"],
  inputs: Reads["ViewInputs"] & Callbacks<Item, ItemState>,
) => {
  const state: State = {
    ...visibilityOf(model.isOpen, model.animation.transitionState),
    isDisabled: inputs.isDisabled ?? false,
    isReadOnly: inputs.isReadOnly ?? false,
    isInvalid: inputs.isInvalid ?? false,
  };

  const part = partsOf(layers, state);

  return {
    className: sxClassName(
      anchored.wrapper,
      part((s) => s.wrapper),
    ),
    inputWrapperClassName: sxClassName(part((s) => s.inputWrapper)),
    inputClassName: sxClassName(part((s) => s.input)),
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
