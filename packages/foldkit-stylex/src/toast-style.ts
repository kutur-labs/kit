import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Toast } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import * as Predicate from "effect/Predicate";
import { defineView, type View } from "foldkit/submodel";

import {
  appendChildClass,
  partsOf,
  type Layers,
  type PartStyle,
  type PartValue,
} from "./internal/part.ts";
import { sxClassName } from "./sx.ts";

/** An entry's state, as `entryToView` gets it. */
export interface EntryState {
  /** The entry's variant, which @foldkit/ui also sets as `data-variant` on the entry. */
  readonly variant: Toast.Variant;
}

// Matches no function anyone writes. It is here so that a state function on `entry` names the fix.
type EntryFunction = (
  state: Readonly<{
    "@foldkit/ui gives every entry one class, so entry takes no state. Style each variant on your own element inside entryToView, from entry.variant.": never;
  }>,
) => never;

/** Styles for each part of a Toast stack. */
export interface Styles {
  /** The stack. @foldkit/ui positions and spaces it inline; style each entry instead. */
  readonly container?: PartValue;
  /**
   * Every entry gets this one class. Animate it with `':is([data-closed])'` and swipe with
   * `':is([data-swipe])'`; style variants on your own element inside `entryToView`.
   */
  readonly entry?: PartValue | EntryFunction;
  /** The element `entryToView` gives the `dismiss` bundle; it dismisses its entry. */
  readonly dismiss?: PartStyle<EntryState>;
}

type Owns = Readonly<{ container: Own.ToastContainer; entry: Own.ToastEntry }>;

type Filled = FilledFromStyles<{ containerClassName: "container"; entryClassName: "entry" }>;

// Everything this module reads from or fills in @foldkit/ui's Toast. `Supported` checks that the
// installed @foldkit/ui still has them. The `ViewInputs` mirror below cannot: a view whose optional
// input was renamed still accepts the mirror's inputs.
type Reads = Readonly<{
  EntryHandlers: Readonly<{ dismiss: ReadonlyArray<ChildAttribute> }>;
  ViewInputs: ClassNames<Filled>;
}>;

type Has = Readonly<{
  EntryHandlers: Toast.EntryHandlers;
  ViewInputs: Parameters<ReturnType<typeof Toast.make<unknown, unknown>>["view"]>[1];
}>;

/**
 * The view inputs of a `Toast.make` module's `view`; @foldkit/ui exports no type for them (F13).
 * A required input @foldkit/ui adds fails the `view` call, because view parameters are contravariant.
 */
export type ViewInputs<Entry> = Readonly<{
  position: Toast.Position;
  entryToView: (entry: Entry, handlers: Toast.EntryHandlers) => Html;
  ariaLabel?: string;
  containerClassName?: string;
  entryClassName?: string;
}>;

/** `ViewInputs` without class names, which come from `styles`. */
export type StyledViewInputs<Entry> = ViewInputs<Entry> & Filled;

/** A `Toast.make` module's `view` with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <
  Model,
  Message,
  Entry extends EntryState,
  const List extends ReadonlyArray<Styles>,
>(
  toastView: Supported<"Toast", Has, Reads, View<Model, Message, ViewInputs<Entry>>>,
  ...layers: Layers<List, Owns>
): View<Model, Message, StyledViewInputs<Entry>> =>
  defineView<Model, Message, StyledViewInputs<Entry>>((model, inputs, h) =>
    toastView(
      model,
      {
        ...inputs,
        containerClassName: sxClassName(layers.map((s) => s.container)),
        entryClassName: sxClassName(
          layers.map((s) => (Predicate.isFunction(s.entry) ? undefined : s.entry)),
        ),
        entryToView: (entry, handlers) =>
          inputs.entryToView(entry, {
            dismiss: appendChildClass(
              handlers.dismiss,
              partsOf(layers, { variant: entry.variant })((s) => s.dismiss),
            ),
          }),
      },
      h,
    ),
  );
