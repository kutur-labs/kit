import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { HoverIntent } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** HoverIntent's state, the same for each of its parts. */
export interface State {
  /**
   * The `isVisible` @foldkit/ui gives `toView`. Hover opens it after a delay and leaving closes it
   * after a grace period; focus opens it at once and Escape closes it at once. @foldkit/ui sets no
   * `data-*` attribute for it.
   */
  readonly isVisible: boolean;
}

/**
 * Styles for each part of HoverIntent, which renders no markup of its own. To fade the panel, keep
 * it rendered and hide it with `visibility: hidden` while not `isVisible`, so the hidden panel
 * takes no hover.
 */
export interface Styles {
  /** The element whose hover or focus opens the panel. */
  readonly trigger?: PartStyle<State>;
  /** The element that stays open while hovered or focused. */
  readonly panel?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's HoverIntent. `Supported` checks that the
// installed @foldkit/ui still has it.
type Reads = Readonly<{
  RenderInfo: Readonly<Record<"trigger" | "panel", ReadonlyArray<ChildAttribute>>> &
    Readonly<{ isVisible: boolean }>;
}>;

type Has = Readonly<{ RenderInfo: HoverIntent.RenderInfo }>;

/**
 * `HoverIntent.view` with each part's styles on the bundles `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  hoverIntentView: Supported<"HoverIntent", Has, Reads, typeof HoverIntent.view>,
  ...layers: Layers<List, Own.None>
): View<HoverIntent.Model, HoverIntent.Message, HoverIntent.ViewInputs> =>
  defineView<HoverIntent.Model, HoverIntent.Message, HoverIntent.ViewInputs>((model, inputs, h) =>
    hoverIntentView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const part = partsOf(layers, { isVisible: render.isVisible } satisfies State);

          return inputs.toView({
            ...render,
            trigger: appendChildClass(
              render.trigger,
              part((s) => s.trigger),
            ),
            panel: appendChildClass(
              render.panel,
              part((s) => s.panel),
            ),
          });
        },
      },
      h,
    ),
  );
