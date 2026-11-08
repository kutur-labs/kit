import type { FileDropStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { FileDrop } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts FileDropStyle styles", () => {
  // `input` is typed as a message: this package hides the input visually.
  const parts = ["root", "input"] satisfies ReadonlyArray<keyof FileDropStyle.Styles>;

  Scene.scene(
    {
      update: (model: FileDrop.Model) => ({ model }),
      view: (model: FileDrop.Model, h: HtmlBuilder<FileDrop.Message>) =>
        FileDrop.view(model, { toView: (render) => keysOf(render, h) }, h),
    },
    Scene.given(FileDrop.init({ id: "upload" })),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
