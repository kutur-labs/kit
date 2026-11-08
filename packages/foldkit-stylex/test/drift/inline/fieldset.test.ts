import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Fieldset } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes nothing inline on Fieldset's parts, enabled or disabled", () => {
  const none = owns<Own.None>()();

  const seen = {
    fieldset: new Set<string>(),
    legend: new Set<string>(),
    description: new Set<string>(),
  };

  for (const isDisabled of [false, true]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Fieldset.view(
            {
              id: "address",
              isDisabled,
              hasDescription: true,
              toView: ({ fieldset, legend, description }) =>
                h.fieldset([...fieldset], [h.legend([...legend], []), h.p([...description], [])]),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#address", seen.fieldset),
      inline("#address-legend", seen.legend),
      inline("#address-description", seen.description),
    );
  }

  expect(sorted(seen.fieldset)).toEqual(sorted(none));
  expect(sorted(seen.legend)).toEqual(sorted(none));
  expect(sorted(seen.description)).toEqual(sorted(none));
});
