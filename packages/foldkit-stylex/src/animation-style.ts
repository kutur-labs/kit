import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type * as Own from "./internal/owned.ts";
import type { Layers, PartStyle } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Animation } from "@foldkit/ui";

import { defineView, type View } from "foldkit/submodel";

import { partsOf } from "./internal/part.ts";
import { isClosed, visibilityOf } from "./internal/transition.ts";
import { sxClassName } from "./sx.ts";

/** The animated element's state, from the Animation model. */
export interface State {
  /**
   * The model's `isShowing`: true from `show` until `hide`, so false while the leave animation
   * plays. Run an enter keyframe animation on the base style and a leave one on `!isShowing`.
   * @foldkit/ui sets no `data-*` attribute for it.
   */
  readonly isShowing: boolean;
  /**
   * True where @foldkit/ui sets `data-closed`: the first frame of the enter animation, the leave
   * animation and, with `animateSize`, while hidden. Put `transition*` on the base style and the
   * closed values here.
   */
  readonly isClosed: boolean;
}

/**
 * Styles for an Animation. With `animateSize`, @foldkit/ui wraps the element in two elements that
 * animate its height inline and take no class.
 */
export interface Styles {
  /** The element @foldkit/ui renders around `content`, a `<div>` unless `element` names another. */
  readonly element?: PartStyle<State>;
}

/** Class name inputs this package fills, typed as the message their misuse prints. */
type Filled = FilledFromStyles<{ className: "element" }>;

// Everything this module reads from or writes to @foldkit/ui's Animation. `stateOf` reads only
// these, and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Model: Readonly<{ isShowing: boolean; transitionState: string }>;
  ViewInputs: ClassNames<Filled>;
}>;

type Has = Readonly<{ Model: Animation.Model; ViewInputs: Animation.ViewInputs }>;

// Without animateSize, @foldkit/ui renders nothing while not visible, so `!isVisible` matters only
// with it, where @foldkit/ui sets data-closed on the idle hidden element.
const stateOf = ({ isShowing, transitionState }: Reads["Model"]): State => ({
  isShowing,
  isClosed: isClosed(transitionState) || !visibilityOf(isShowing, transitionState).isVisible,
});

/** `Animation.ViewInputs` without `className`, which comes from `styles`. */
export type ViewInputs = Animation.ViewInputs & Filled;

/**
 * `Animation.view` with the element's styles. Pass several styles objects to layer them: later
 * ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  animationView: Supported<"Animation", Has, Reads, typeof Animation.view>,
  ...layers: Layers<List, Own.None>
): View<Animation.Model, Animation.Message, ViewInputs> =>
  defineView<Animation.Model, Animation.Message, ViewInputs>((model, inputs, h) =>
    animationView(
      model,
      { ...inputs, className: sxClassName(partsOf(layers, stateOf(model))((s) => s.element)) },
      h,
    ),
  );
