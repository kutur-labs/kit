import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Popover } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { anchored } from "./internal/functional-styles.ts";
import { popoverPanel } from "./internal/markers.stylex.ts";
import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";
import { isClosed } from "./internal/transition.ts";
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

type Owns = Readonly<{
  wrapper: Own.Wrapper;
  button: Own.OpenTrigger;
  panel: Own.AnchoredPanel;
  backdrop: Own.Backdrop;
  arrow: Own.Arrow;
}>;

// Everything this module reads from @foldkit/ui's Popover. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<
    Record<"button" | "panel" | "backdrop" | "arrow", ReadonlyArray<ChildAttribute>>
  > &
    Readonly<{ isVisible: boolean }>;
  Model: Readonly<{ animation: Readonly<{ transitionState: string }> }>;
  ViewInputs: Readonly<{ isDisabled?: boolean }>;
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
 * `Popover.view` with each part's styles on the bundles `toView` gets. Pass several styles objects
 * to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  popoverView: Supported<"Popover", Has, Reads, typeof Popover.view>,
  ...layers: Layers<List, Owns>
): View<Popover.Model, Popover.Message, ViewInputs> =>
  defineView<Popover.Model, Popover.Message, ViewInputs>((model, { toView, ...inputs }, h) =>
    popoverView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const state = stateOf(model, inputs, render);
          const part = partsOf(layers, state);

          return toView({
            ...render,
            wrapper: [
              sx(
                anchored.wrapper,
                part((s) => s.wrapper),
              ),
            ],
            button: appendChildClass(
              render.button,
              part((s) => s.button),
            ),
            panel: appendChildClass(
              render.panel,
              anchored.panel,
              popoverPanel,
              part((s) => s.panel),
            ),
            backdrop: appendChildClass(
              render.backdrop,
              anchored.backdrop,
              part((s) => s.backdrop),
            ),
            arrow: appendChildClass(
              render.arrow,
              anchored.arrow,
              part((s) => s.arrow),
            ),
          });
        },
      },
      h,
    ),
  );
