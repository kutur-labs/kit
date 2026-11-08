import type { ProgressStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Progress } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts ProgressStyle styles, with and without a value", () => {
  const parts = ["progress", "label", "track", "indicator"] satisfies ReadonlyArray<
    keyof ProgressStyle.Styles
  >;

  for (const config of [{ value: 1 }, {}]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Progress.view(
            { ...config, id: "upload", toView: (attributes) => keysOf(attributes, h) },
            h,
          ),
      },
      Scene.given(null),
      Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
    );
  }
});
