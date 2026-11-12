import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type { Supported } from "./internal/supported.ts";
import type { Toast } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import {
  appendChildClass,
  partsOf,
  staticPartsOf,
  type CheckedLayers,
  type PartStyle,
  type StatelessPart,
} from "./internal/part.ts";
import { sxClassName } from "./sx.ts";

/** An entry's state, as `entryToView` gets it. */
export interface EntryState {
  /** The entry's variant, which @foldkit/ui also sets as `data-variant` on the entry. */
  readonly variant: Toast.Variant;
}

/** Styles for each part of a Toast stack. */
export interface Styles {
  /** The stack. @foldkit/ui positions and spaces it inline; style each entry instead. */
  readonly container?: StatelessPart;
  /**
   * Every entry gets this one class. Animate it with `':is([data-closed])'` and swipe with
   * `':is([data-swipe])'`; style variants on your own element inside `entryToView`.
   */
  readonly entry?: StatelessPart<"@foldkit/ui gives every entry one class, so entry takes no state. Style each variant on your own element inside entryToView, from entry.variant.">;
  /** The element `entryToView` gives the `dismiss` bundle; it dismisses its entry. */
  readonly dismiss?: PartStyle<EntryState>;
}

type Filled = FilledFromStyles<{ containerClassName: "container"; entryClassName: "entry" }>;

// Everything this module reads from or fills in @foldkit/ui's Toast. `view` reads only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them. The
// `UiViewInputs` mirror below cannot: a view whose optional input was renamed still accepts the
// mirror's inputs.
type Reads = Readonly<{
  EntryHandlers: Readonly<{ dismiss: ReadonlyArray<ChildAttribute> }>;
  ViewInputs: ClassNames<Filled> &
    Readonly<{ entryToView: (entry: never, handlers: never) => void }>;
}>;

type Has = Readonly<{
  EntryHandlers: Toast.EntryHandlers;
  ViewInputs: Parameters<ReturnType<typeof Toast.make<unknown, unknown>>["view"]>[1];
}>;

// The view inputs of a `Toast.make` module's `view`, which @foldkit/ui exports no type for. A
// required input @foldkit/ui adds fails the `view` call, because view parameters are contravariant.
type UiViewInputs<Entry> = Readonly<{
  position: Toast.Position;
  entryToView: (entry: Entry, handlers: Toast.EntryHandlers) => Html;
  ariaLabel?: string;
  containerClassName?: string;
  entryClassName?: string;
}>;

/** The view inputs of a `Toast.make` module's `view` without class names, which come from `styles`. */
export type ViewInputs<Entry> = UiViewInputs<Entry> & Filled;

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Toast", Before>;

/** A `Toast.make` module's `view` with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <
  Model,
  Message,
  Entry extends EntryState,
  const List extends ReadonlyArray<Styles>,
>(
  toastView: Supported<"Toast", Has, Reads, View<Model, Message, UiViewInputs<Entry>>>,
  ...layers: Layers<List>
): View<Model, Message, ViewInputs<Entry>> =>
  defineView<Model, Message, ViewInputs<Entry>>((model, inputs, h) =>
    toastView(
      model,
      {
        ...inputs,
        containerClassName: sxClassName(staticPartsOf(layers)((s) => s.container)),
        entryClassName: sxClassName(staticPartsOf(layers)((s) => s.entry)),
        entryToView: (entry, handlers) => {
          const reads: Reads["EntryHandlers"] = handlers;

          return inputs.entryToView(entry, {
            dismiss: appendChildClass(
              reads.dismiss,
              partsOf(layers, { variant: entry.variant })((s) => s.dismiss),
            ),
          });
        },
      },
      h,
    ),
  );
