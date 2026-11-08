import type { Supported } from "./internal/supported.ts";
import type { Dialog } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { dialog } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";
import { isClosed, type TransitionState } from "./internal/transition.ts";

/** A dialog's state, the same for each of its parts. */
export interface State {
  /** Shown: open, or playing its leave animation. This package hides the dialog otherwise. */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed` on the backdrop and panel. Put `transition*` on the
   * base style. @foldkit/ui waits for the panel's animation only, so the backdrop's must not outlast it.
   */
  readonly isClosed: boolean;
}

/** Styles for each part of a Dialog. */
export interface Styles {
  /** The `<dialog>`, which covers the viewport while shown. Lay out the panel here; style the panel itself. */
  readonly dialog?: PartStyle<State>;
  /** Covers the viewport; a click on it closes the dialog. Style its color and opacity. */
  readonly backdrop?: PartStyle<State>;
  /** The box inside the `<dialog>` that holds its content; @foldkit/ui waits for its animation. */
  readonly panel?: PartStyle<State>;
  /** The heading that names the dialog through `aria-labelledby`. */
  readonly title?: PartStyle<State>;
  /** Text that describes the dialog; @foldkit/ui links it only when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
  /** A button that closes the dialog; it ignores clicks while the dialog leaves. */
  readonly closeButton?: PartStyle<State>;
}

type Part = "dialog" | "backdrop" | "panel" | "title" | "description" | "closeButton";

// Everything this module reads from @foldkit/ui's Dialog. `stateOf` and `view` read only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<Record<Part, ReadonlyArray<ChildAttribute>>> &
    Readonly<{ isVisible: boolean }>;
  Model: Readonly<{ animation: Readonly<{ transitionState: TransitionState }> }>;
  ViewInputs: Readonly<{ toView: (render: never) => void }>;
}>;

type Has = Readonly<{
  RenderInfo: Dialog.RenderInfo;
  Model: Dialog.Model;
  ViewInputs: Dialog.ViewInputs;
}>;

const stateOf = (model: Reads["Model"], render: Reads["RenderInfo"]): State => ({
  isVisible: render.isVisible,
  isClosed: isClosed(model.animation.transitionState),
});

/** `Dialog.view` with each part's styles on the bundles `toView` gets. */
export const view = <const List extends ReadonlyArray<Styles>>(
  dialogView: Supported<"Dialog", Has, Reads, typeof Dialog.view>,
  ...layers: Layers<List, Styles, "Dialog">
): View<Dialog.Model, Dialog.Message, Dialog.ViewInputs> =>
  defineView<Dialog.Model, Dialog.Message, Dialog.ViewInputs>((model, inputs, h) =>
    dialogView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const reads: Reads["RenderInfo"] = render;
          const state = stateOf(model, reads);
          const part = partsOf(layers, state);

          return inputs.toView({
            ...render,
            // After the app's styles: an author display shows a closed <dialog>.
            dialog: appendChildClass(
              reads.dialog,
              dialog.dialog,
              part((s) => s.dialog),
              !state.isVisible && dialog.hidden,
            ),
            backdrop: appendChildClass(
              reads.backdrop,
              dialog.backdrop,
              part((s) => s.backdrop),
            ),
            panel: appendChildClass(
              reads.panel,
              dialog.panel,
              part((s) => s.panel),
            ),
            title: appendChildClass(
              reads.title,
              part((s) => s.title),
            ),
            description: appendChildClass(
              reads.description,
              part((s) => s.description),
            ),
            closeButton: appendChildClass(
              reads.closeButton,
              part((s) => s.closeButton),
            ),
          });
        },
      },
      h,
    ),
  );
