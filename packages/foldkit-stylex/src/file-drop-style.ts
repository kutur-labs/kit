import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { FileDrop } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { fileDrop } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A file drop zone's state. */
export interface State {
  /** A drag hovers over the zone, where @foldkit/ui sets `data-drag-over` on `root`. */
  readonly isDragOver: boolean;
  /**
   * The `isDisabled` input; @foldkit/ui sets `data-disabled` on `root` and `disabled` on the input,
   * and ignores drops.
   */
  readonly isDisabled: boolean;
}

/**
 * Styles for a FileDrop zone. Style keyboard focus on `root` with `':has(:focus-visible)'`;
 * `':focus-within'` also matches after a click, because the click focuses the input.
 */
export interface Styles {
  /** The drop zone, usually a `<label>` around the input. */
  readonly root?: PartStyle<State>;
  readonly input?: "FileDrop's input is visually hidden: style root, with ':has(:focus-visible)' for keyboard focus.";
}

// Everything this module reads from @foldkit/ui's FileDrop. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<Record<"root" | "input", ReadonlyArray<ChildAttribute>>>;
  Model: Readonly<{ isDragOver: boolean }>;
  ViewInputs: Readonly<{ isDisabled?: boolean }>;
}>;

type Has = Readonly<{
  RenderInfo: FileDrop.FileDropAttributes;
  Model: FileDrop.Model;
  ViewInputs: FileDrop.ViewInputs;
}>;

const stateOf = (model: Reads["Model"], inputs: Reads["ViewInputs"]): State => ({
  isDragOver: model.isDragOver,
  isDisabled: inputs.isDisabled ?? false,
});

/**
 * `FileDrop.view` with the root's styles on the bundle `toView` gets, and the input visually
 * hidden. Pass several styles objects to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  fileDropView: Supported<"FileDrop", Has, Reads, typeof FileDrop.view>,
  ...layers: Layers<List, Own.None>
): View<FileDrop.Model, FileDrop.Message, FileDrop.ViewInputs> =>
  defineView<FileDrop.Model, FileDrop.Message, FileDrop.ViewInputs>((model, inputs, h) =>
    fileDropView(
      model,
      {
        ...inputs,
        toView: (attributes) =>
          inputs.toView({
            ...attributes,
            root: appendChildClass(
              attributes.root,
              partsOf(layers, stateOf(model, inputs))((s) => s.root),
            ),
            // Replaces @foldkit/ui's Tailwind sr-only class, which no stylesheet of the app defines.
            input: appendChildClass(attributes.input, fileDrop.input),
          }),
      },
      h,
    ),
  );
