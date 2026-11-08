import type { DialogStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts DialogStyle styles", () => {
  const parts = [
    "dialog",
    "backdrop",
    "panel",
    "title",
    "description",
    "closeButton",
  ] satisfies ReadonlyArray<keyof DialogStyle.Styles>;

  Scene.scene(
    {
      update: (model: Dialog.Model) => ({ model }),
      view: (model: Dialog.Model, h: HtmlBuilder<Dialog.Message>) =>
        Dialog.view(model, { toView: (render) => keysOf(render, h) }, h),
    },
    Scene.given(Dialog.init({ id: "confirm" })),
    // A marker for the element that takes focus on open, which the app puts on its own element.
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts, "initialFocus")),
  );
});
