import type { Supported } from "./internal/supported.ts";
import type { Slider } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import * as Predicate from "effect/Predicate";
import { defineView, type View } from "foldkit/submodel";

import { appendChildClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/** A slider's state, the same for each of its parts. */
export interface State {
  /** The thumb is being dragged; @foldkit/ui sets `data-dragging` on the root. */
  readonly isDragging: boolean;
  /** The `isDisabled` input; @foldkit/ui sets `data-disabled` on the root. */
  readonly isDisabled: boolean;
  /** The `isReadOnly` input; @foldkit/ui sets `data-readonly` on the root. */
  readonly isReadOnly: boolean;
  /** The `orientation` input, `"Horizontal"` unless set; @foldkit/ui sets `data-orientation`. */
  readonly orientation: Slider.Orientation;
}

/** Styles for each part of a Slider. */
export interface Styles {
  /** The element around the label and track, which carries the state hooks. */
  readonly root?: PartStyle<State>;
  /** The label that names the thumb unless `ariaLabel` or `ariaLabelledBy` is set. */
  readonly label?: PartStyle<State>;
  /** @foldkit/ui makes it `position: relative`; centre the thumb with `display: flex; align-items: center`. */
  readonly track?: PartStyle<State>;
  /** The track from its start to the value; @foldkit/ui sizes it inline, so style its color. */
  readonly filledTrack?: PartStyle<State>;
  /** @foldkit/ui positions it with an inline transform; use `scale` for press feedback. */
  readonly thumb?: PartStyle<State>;
}

type Part = "root" | "label" | "track" | "filledTrack" | "thumb";

// Everything this module reads from @foldkit/ui's Slider. `stateOf` and `view` read only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them. Tags and
// orientations are spelled out, so a renamed one fails `Supported` too.
type Reads = Readonly<{
  RenderInfo: Readonly<Record<Part, ReadonlyArray<ChildAttribute>>>;
  Model: Readonly<{ dragState: Readonly<{ _tag: "Idle" }> | Readonly<{ _tag: "Dragging" }> }>;
  ViewInputs: Readonly<{
    isDisabled?: boolean;
    isReadOnly?: boolean;
    orientation?: "Horizontal" | "Vertical";
    toView: (attributes: never) => void;
  }>;
}>;

type Has = Readonly<{
  RenderInfo: Slider.SliderAttributes;
  Model: Slider.Model;
  ViewInputs: Slider.ViewInputs;
}>;

const stateOf = (model: Reads["Model"], inputs: Reads["ViewInputs"]): State => ({
  isDragging: Predicate.isTagged(model.dragState, "Dragging"),
  isDisabled: inputs.isDisabled ?? false,
  isReadOnly: inputs.isReadOnly ?? false,
  orientation: inputs.orientation ?? "Horizontal",
});

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Slider", Before>;

/** `Slider.view` with each part's styles on the bundles `toView` gets. */
export const view = <const List extends ReadonlyArray<Styles>>(
  sliderView: Supported<"Slider", Has, Reads, typeof Slider.view>,
  ...layers: Layers<List>
): View<Slider.Model, Slider.Message, Slider.ViewInputs> =>
  defineView<Slider.Model, Slider.Message, Slider.ViewInputs>((model, inputs, h) => {
    const state = stateOf(model, inputs);
    const part = partsOf(layers, state);

    return sliderView(
      model,
      {
        ...inputs,
        toView: (attributes) => {
          const reads: Reads["RenderInfo"] = attributes;

          return inputs.toView({
            ...attributes,
            root: appendChildClass(
              reads.root,
              part((s) => s.root),
            ),
            label: appendChildClass(
              reads.label,
              part((s) => s.label),
            ),
            track: appendChildClass(
              reads.track,
              part((s) => s.track),
            ),
            filledTrack: appendChildClass(
              reads.filledTrack,
              part((s) => s.filledTrack),
            ),
            thumb: appendChildClass(
              reads.thumb,
              part((s) => s.thumb),
            ),
          });
        },
      },
      h,
    );
  });
