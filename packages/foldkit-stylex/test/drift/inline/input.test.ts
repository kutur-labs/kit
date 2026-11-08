import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Input } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes nothing inline on Input's parts, with every flag off or on", () => {
  const none = owns<Own.None>()();

  const seen = {
    input: new Set<string>(),
    label: new Set<string>(),
    description: new Set<string>(),
  };

  for (const flag of [false, true]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<string>) =>
          Input.view(
            {
              id: "name",
              isDisabled: flag,
              isReadOnly: flag,
              isInvalid: flag,
              hasDescription: true,
              onInput: (value) => value,
              toView: ({ input, label, description }) =>
                h.div(
                  [],
                  [h.label([...label], []), h.input([...input]), h.p([...description], [])],
                ),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#name", seen.input),
      inline("label", seen.label),
      inline("#name-description", seen.description),
    );
  }

  expect(sorted(seen.input)).toEqual(sorted(none));
  expect(sorted(seen.label)).toEqual(sorted(none));
  expect(sorted(seen.description)).toEqual(sorted(none));
});
