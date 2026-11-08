import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes nothing inline on Select's parts, with every flag off or on", () => {
  const none = owns<Own.None>()();

  const seen = {
    select: new Set<string>(),
    label: new Set<string>(),
    description: new Set<string>(),
  };

  for (const flag of [false, true]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<string>) =>
          Select.view(
            {
              id: "language",
              isDisabled: flag,
              isInvalid: flag,
              hasDescription: true,
              onChange: (value) => value,
              toView: ({ select, label, description }) =>
                h.div(
                  [],
                  [h.label([...label], []), h.select([...select], []), h.p([...description], [])],
                ),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#language", seen.select),
      inline("label", seen.label),
      inline("#language-description", seen.description),
    );
  }

  expect(sorted(seen.select)).toEqual(sorted(none));
  expect(sorted(seen.label)).toEqual(sorted(none));
  expect(sorted(seen.description)).toEqual(sorted(none));
});
