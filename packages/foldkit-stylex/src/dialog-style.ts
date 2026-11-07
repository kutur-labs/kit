import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Dialog } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { dialog } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";
import { isClosed } from "./internal/transition.ts";

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
  readonly panel?: PartStyle<State>;
  readonly title?: PartStyle<State>;
  readonly description?: PartStyle<State>;
  readonly closeButton?: PartStyle<State>;
}

type Owns = Readonly<{ dialog: Own.DialogElement; backdrop: Own.DialogBackdrop }>;

type Part = "dialog" | "backdrop" | "panel" | "title" | "description" | "closeButton";

type Reads = Readonly<{
  RenderInfo: Readonly<Record<Part, ReadonlyArray<ChildAttribute>>> &
    Readonly<{ isVisible: boolean }>;
  Model: Readonly<{ animation: Readonly<{ transitionState: string }> }>;
}>;

type Has = Readonly<{ RenderInfo: Dialog.RenderInfo; Model: Dialog.Model }>;

const stateOf = (model: Reads["Model"], render: Reads["RenderInfo"]): State => ({
  isVisible: render.isVisible,
  isClosed: isClosed(model.animation.transitionState),
});

/** `Dialog.view` with each part's styles on the bundles `toView` gets. */
export const view = <const List extends ReadonlyArray<Styles>>(
  dialogView: Supported<"Dialog", Has, Reads, typeof Dialog.view>,
  ...layers: Layers<List, Owns>
): View<Dialog.Model, Dialog.Message, Dialog.ViewInputs> =>
  defineView<Dialog.Model, Dialog.Message, Dialog.ViewInputs>((model, inputs, h) =>
    dialogView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const state = stateOf(model, render);
          const part = partsOf(layers, state);

          return inputs.toView({
            ...render,
            // After the app's styles: an author display shows a closed <dialog>.
            dialog: appendChildClass(
              render.dialog,
              dialog.dialog,
              part((s) => s.dialog),
              !state.isVisible && dialog.hidden,
            ),
            backdrop: appendChildClass(
              render.backdrop,
              dialog.backdrop,
              part((s) => s.backdrop),
            ),
            panel: appendChildClass(
              render.panel,
              dialog.panel,
              part((s) => s.panel),
            ),
            title: appendChildClass(
              render.title,
              part((s) => s.title),
            ),
            description: appendChildClass(
              render.description,
              part((s) => s.description),
            ),
            closeButton: appendChildClass(
              render.closeButton,
              part((s) => s.closeButton),
            ),
          });
        },
      },
      h,
    ),
  );
