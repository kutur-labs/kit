import type { TextareaStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Textarea } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts TextareaStyle styles", () => {
  const parts = ["textarea", "label", "description"] satisfies ReadonlyArray<
    keyof TextareaStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Textarea.view({ id: "bio", toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(null),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
