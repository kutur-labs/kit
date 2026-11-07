import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Slider } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import * as Predicate from "effect/Predicate";
import { defineView, type View } from "foldkit/submodel";

import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A slider's state, the same for each of its parts. */
export interface State {
  readonly isDragging: boolean;
  readonly isDisabled: boolean;
  readonly isReadOnly: boolean;
  readonly orientation: Slider.Orientation;
}

/** Styles for each part of a Slider. */
export interface Styles {
  readonly root?: PartStyle<State>;
  readonly label?: PartStyle<State>;
  /** @foldkit/ui makes it `position: relative`; centre the thumb with `display: flex; align-items: center`. */
  readonly track?: PartStyle<State>;
  readonly filledTrack?: PartStyle<State>;
  /** @foldkit/ui positions it with an inline transform; use `scale` for press feedback. */
  readonly thumb?: PartStyle<State>;
}

type Owns = Readonly<{
  track: Own.SliderTrack;
  filledTrack: Own.SliderFill;
  thumb: Own.SliderThumb;
}>;

type Part = "root" | "label" | "track" | "filledTrack" | "thumb";

type Reads = Readonly<{
  RenderInfo: Readonly<Record<Part, ReadonlyArray<ChildAttribute>>>;
  Model: Readonly<{ dragState: Readonly<{ _tag: string }> }>;
  ViewInputs: Readonly<{
    isDisabled?: boolean;
    isReadOnly?: boolean;
    orientation?: Slider.Orientation;
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

/** `Slider.view` with each part's styles on the bundles `toView` gets. */
export const view = <const List extends ReadonlyArray<Styles>>(
  sliderView: Supported<"Slider", Has, Reads, typeof Slider.view>,
  ...layers: Layers<List, Owns>
): View<Slider.Model, Slider.Message, Slider.ViewInputs> =>
  defineView<Slider.Model, Slider.Message, Slider.ViewInputs>((model, inputs, h) => {
    const state = stateOf(model, inputs);
    const part = partsOf(layers, state);

    return sliderView(
      model,
      {
        ...inputs,
        toView: (attributes) =>
          inputs.toView({
            ...attributes,
            root: appendChildClass(
              attributes.root,
              part((s) => s.root),
            ),
            label: appendChildClass(
              attributes.label,
              part((s) => s.label),
            ),
            track: appendChildClass(
              attributes.track,
              part((s) => s.track),
            ),
            filledTrack: appendChildClass(
              attributes.filledTrack,
              part((s) => s.filledTrack),
            ),
            thumb: appendChildClass(
              attributes.thumb,
              part((s) => s.thumb),
            ),
          }),
      },
      h,
    );
  });
