import type { PopoverStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts PopoverStyle styles", () => {
  const parts = ["button", "panel", "backdrop", "arrow"] satisfies ReadonlyArray<
    keyof PopoverStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: Popover.Model) => ({ model }),
      view: (model: Popover.Model, h: HtmlBuilder<Popover.Message>) =>
        Popover.view(model, { anchor: {}, toView: (render) => keysOf(render, h) }, h),
    },
    Scene.given(Popover.init({ id: "help" })),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
