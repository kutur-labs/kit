import type { Supported } from "./internal/supported.ts";
import type { Tooltip } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { anchored } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/** A tooltip's state, the same for each of its parts. */
export interface State {
  /**
   * The tooltip is open, where @foldkit/ui sets `data-open` on the trigger and the panel. A tooltip
   * has no leave animation, so it turns false as soon as the tooltip hides.
   */
  readonly isVisible: boolean;
  /** Where @foldkit/ui sets `data-disabled` on the trigger, which then never opens the tooltip. */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Tooltip. */
export interface Styles {
  /** The element the tooltip describes; @foldkit/ui gives it `type="button"`. */
  readonly trigger?: PartStyle<State>;
  /**
   * Floating UI positions it and caps its height, and it takes no pointer events. It renders
   * outside your view, so set `color`.
   */
  readonly panel?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Tooltip. `stateOf` and `view` read only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<Record<"trigger" | "panel", ReadonlyArray<ChildAttribute>>> &
    Readonly<{ isVisible: boolean }>;
  ViewInputs: Readonly<{ isDisabled?: boolean; toView: (render: never) => void }>;
}>;

type Has = Readonly<{ RenderInfo: Tooltip.RenderInfo; ViewInputs: Tooltip.ViewInputs }>;

const stateOf = (inputs: Reads["ViewInputs"], render: Reads["RenderInfo"]): State => ({
  isVisible: render.isVisible,
  isDisabled: inputs.isDisabled ?? false,
});

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Tooltip", Before>;

/**
 * `Tooltip.view` with each part's styles on the bundles `toView` gets. Pass several styles objects
 * to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  tooltipView: Supported<"Tooltip", Has, Reads, typeof Tooltip.view>,
  ...layers: Layers<List>
): View<Tooltip.Model, Tooltip.Message, Tooltip.ViewInputs> =>
  defineView<Tooltip.Model, Tooltip.Message, Tooltip.ViewInputs>((model, inputs, h) =>
    tooltipView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const reads: Reads["RenderInfo"] = render;
          const part = partsOf(layers, stateOf(inputs, reads));

          return inputs.toView({
            ...render,
            trigger: appendChildClass(
              reads.trigger,
              part((s) => s.trigger),
            ),
            panel: appendChildClass(
              reads.panel,
              anchored.panel,
              part((s) => s.panel),
            ),
          });
        },
      },
      h,
    ),
  );
