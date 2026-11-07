// Styles, state and inputs shared by ListboxStyle.view and ListboxStyle.Multi.view.
import type { ClassNames, FilledFromStyles } from "./filled.ts";
import type { GroupToHeading } from "./items.ts";
import type * as Own from "./owned.ts";

import { sxClassName } from "../sx.ts";
import { anchored } from "./functional-styles.ts";
import { styledCallbacks, type Callbacks } from "./items.ts";
import { partsOf, type PartStyle } from "./part.ts";
import { visibilityOf } from "./transition.ts";

/** A listbox's state, the same for each part but `item`. */
export interface State {
  /**
   * The list is rendered: open, or playing its leave animation. @foldkit/ui sets `data-open`
   * then. For a fade, style `isClosed`: this stays true while the list leaves.
   */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed` on `items`: the first frame of the enter animation
   * and the leave animation. Put `transition*` on the base style and the closed values here.
   */
  readonly isClosed: boolean;
  readonly isDisabled: boolean;
  readonly isReadOnly: boolean;
  readonly isInvalid: boolean;
}

/** An item's state, as @foldkit/ui passes it to `itemToConfig`. */
export interface ItemState {
  /** The highlighted item, which @foldkit/ui marks with `data-active`. */
  readonly isActive: boolean;
  readonly isDisabled: boolean;
  readonly isReadOnly: boolean;
  readonly isSelected: boolean;
}

/** Styles for each part of a Listbox or Listbox.Multi. */
export interface Styles {
  /** The positioned element around the button. */
  readonly wrapper?: PartStyle<State>;
  /** @foldkit/ui lifts it to `position: relative; z-index: 1` while the list is open. */
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
  readonly item?: PartStyle<ItemState>;
  readonly group?: PartStyle<State>;
  /** The heading `groupToHeading` returns content for. */
  readonly heading?: PartStyle<State>;
  /** A separator between groups; @foldkit/ui renders it only when this part is styled. */
  readonly separator?: PartStyle<State>;
  readonly panel?: "Listbox calls its panel items: put these styles under items.";
}

export type Owns = Readonly<{
  wrapper: Own.Wrapper;
  button: Own.OpenTrigger;
  backdrop: Own.Backdrop;
  items: Own.AnchoredPanel;
}>;

/** Class name inputs this package fills, typed as the message their misuse prints. */
export type Filled = FilledFromStyles<{
  className: "wrapper";
  buttonClassName: "button";
  backdropClassName: "backdrop";
  itemsClassName: "items";
  itemsScrollClassName: "itemsScroll";
  groupClassName: "group";
  separatorClassName: "separator";
}>;

// Everything both Listbox views read or write. `styledInputs` touches only these, and `Supported`
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
