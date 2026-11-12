import type { Supported } from "./internal/supported.ts";
import type { Popover } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { anchored } from "./internal/functional-styles.ts";
import { popoverPanel } from "./internal/markers.stylex.ts";
import { appendChildClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";
import { isClosed, type TransitionState } from "./internal/transition.ts";
import { sx, type ClassAttribute } from "./sx.ts";

/** A popover's state, the same for each of its parts. */
export interface State {
  /** The panel is rendered: open, or playing its leave animation. */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed`: the first frame of the enter animation and the
   * leave animation. Put `transition*` on the base style and the closed values here.
   */
  readonly isClosed: boolean;
  /** The `isDisabled` input; @foldkit/ui sets `aria-disabled` and `data-disabled` on the button. */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Popover. */
export interface Styles {
  /** The positioned element around the trigger, which `toView` gets as `wrapper`. */
  readonly wrapper?: PartStyle<State>;
  /** @foldkit/ui lifts it to `position: relative; z-index: 1` while the panel is open. */
  readonly button?: PartStyle<State>;
  /** Floating UI positions it and caps its height. It renders outside your view, so set `color`. */
  readonly panel?: PartStyle<State>;
  /** Covers the viewport while open, to catch outside clicks; style its color and opacity. */
  readonly backdrop?: PartStyle<State>;
  /** Draw it pointing up in a square box; this package centres it on the facing edge and turns it. */
  readonly arrow?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Popover. `stateOf` and `view` read only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<
    Record<"button" | "panel" | "backdrop" | "arrow", ReadonlyArray<ChildAttribute>>
  > &
    Readonly<{ isVisible: boolean }>;
  Model: Readonly<{ animation: Readonly<{ transitionState: TransitionState }> }>;
  ViewInputs: Readonly<{ isDisabled?: boolean; toView: (render: never) => void }>;
}>;

type Has = Readonly<{
  RenderInfo: Popover.RenderInfo;
  Model: Popover.Model;
  ViewInputs: Popover.ViewInputs;
}>;

const stateOf = (
  model: Reads["Model"],
  inputs: Reads["ViewInputs"],
  render: Reads["RenderInfo"],
): State => ({
  isVisible: render.isVisible,
  isClosed: isClosed(model.animation.transitionState),
  isDisabled: inputs.isDisabled ?? false,
});

/** `Popover.RenderInfo` with each part styled, plus `wrapper` for the trigger's parent element. */
export type RenderInfo = Popover.RenderInfo & Readonly<{ wrapper: ReadonlyArray<ClassAttribute> }>;

/** `Popover.ViewInputs` whose `toView` gets the styled `RenderInfo`. */
export type ViewInputs = Omit<Popover.ViewInputs, "toView"> &
  Readonly<{ toView: (render: RenderInfo) => Html }>;

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Popover", Before>;

/**
 * `Popover.view` with each part's styles on the bundles `toView` gets. Pass several styles objects
 * to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  popoverView: Supported<"Popover", Has, Reads, typeof Popover.view>,
  ...layers: Layers<List>
): View<Popover.Model, Popover.Message, ViewInputs> =>
  defineView<Popover.Model, Popover.Message, ViewInputs>((model, inputs, h) =>
    popoverView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const reads: Reads["RenderInfo"] = render;
          const part = partsOf(layers, stateOf(model, inputs, reads));

          return inputs.toView({
            ...render,
            wrapper: [
              sx(
                anchored.wrapper,
                part((s) => s.wrapper),
              ),
            ],
            button: appendChildClass(
              reads.button,
              part((s) => s.button),
            ),
            panel: appendChildClass(
              reads.panel,
              anchored.panel,
              popoverPanel,
              part((s) => s.panel),
            ),
            backdrop: appendChildClass(
              reads.backdrop,
              anchored.backdrop,
              part((s) => s.backdrop),
            ),
            arrow: appendChildClass(
              reads.arrow,
              anchored.arrow,
              part((s) => s.arrow),
            ),
          });
        },
      },
      h,
    ),
  );
