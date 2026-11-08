import type { TooltipStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts TooltipStyle styles", () => {
  const parts = ["trigger", "panel"] satisfies ReadonlyArray<keyof TooltipStyle.Styles>;

  Scene.scene(
    {
      update: (model: Tooltip.Model) => ({ model }),
      view: (model: Tooltip.Model, h: HtmlBuilder<Tooltip.Message>) =>
        Tooltip.view(model, { anchor: {}, toView: (render) => keysOf(render, h) }, h),
    },
    Scene.given(Tooltip.init({ id: "save" })),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
