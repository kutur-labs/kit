import type { SelectStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts SelectStyle styles", () => {
  const parts = ["select", "label", "description"] satisfies ReadonlyArray<
    keyof SelectStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Select.view({ id: "language", toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
