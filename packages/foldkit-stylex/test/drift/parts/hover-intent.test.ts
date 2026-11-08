import type { HoverIntentStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { HoverIntent } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts HoverIntentStyle styles", () => {
  const parts = ["trigger", "panel"] satisfies ReadonlyArray<keyof HoverIntentStyle.Styles>;

  Scene.scene(
    {
      update: (model: HoverIntent.Model) => ({ model }),
      view: (model: HoverIntent.Model, h: HtmlBuilder<HoverIntent.Message>) =>
        HoverIntent.view(model, { toView: (render) => keysOf(render, h) }, h),
    },
    Scene.given(HoverIntent.init()),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
