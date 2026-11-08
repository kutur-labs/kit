import type { MeterStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Meter } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts MeterStyle styles", () => {
  const parts = ["meter", "label", "fill"] satisfies ReadonlyArray<keyof MeterStyle.Styles>;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Meter.view({ id: "storage", value: 1, toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
