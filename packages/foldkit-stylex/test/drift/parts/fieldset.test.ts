import type { FieldsetStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Fieldset } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts FieldsetStyle styles", () => {
  const parts = ["fieldset", "legend", "description"] satisfies ReadonlyArray<
    keyof FieldsetStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Fieldset.view({ id: "address", toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
