import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Progress } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Progress's indicator owns, with and without a value", () => {
  const indicator = owns<Own.Owns["Progress"]["indicator"]>()("width");
  const seen = new Set<string>();

  for (const config of [{ value: 40 }, {}]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Progress.view(
            {
              ...config,
              id: "upload",
              toView: (attributes) => h.div([...attributes.indicator, h.Id("indicator")], []),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#indicator", seen),
    );
  }

  expect(sorted(seen)).toEqual(sorted(indicator));
});
