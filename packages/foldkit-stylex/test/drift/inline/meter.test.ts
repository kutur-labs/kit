import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Meter } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Meter's fill owns", () => {
  const fill = owns<Own.ValueFill>()("width");
  const seen = new Set<string>();

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Meter.view(
          {
            id: "storage",
            value: 40,
            toView: (attributes) => h.div([...attributes.fill, h.Id("fill")], []),
          },
          h,
        ),
    },
    Scene.given(null),
    inline("#fill", seen),
  );

  expect(sorted(seen)).toEqual(sorted(fill));
});
