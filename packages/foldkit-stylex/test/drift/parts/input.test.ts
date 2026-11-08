import type { InputStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Input } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts InputStyle styles", () => {
  const parts = ["input", "label", "description"] satisfies ReadonlyArray<keyof InputStyle.Styles>;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Input.view({ id: "name", toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
