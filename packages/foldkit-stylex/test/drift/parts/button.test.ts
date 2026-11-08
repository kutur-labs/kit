import type { ButtonStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Button } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts ButtonStyle styles", () => {
  const parts = ["button"] satisfies ReadonlyArray<keyof ButtonStyle.Styles>;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Button.view({ toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
