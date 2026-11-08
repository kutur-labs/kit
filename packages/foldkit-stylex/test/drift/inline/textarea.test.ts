import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Textarea } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes nothing inline on Textarea's parts, with every flag off or on", () => {
  const none = owns<Own.None>()();

  const seen = {
    textarea: new Set<string>(),
    label: new Set<string>(),
    description: new Set<string>(),
  };

  for (const flag of [false, true]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<string>) =>
          Textarea.view(
            {
              id: "bio",
              isDisabled: flag,
              isReadOnly: flag,
              isInvalid: flag,
              hasDescription: true,
              onInput: (value) => value,
              toView: ({ textarea, label, description }) =>
                h.div(
                  [],
                  [h.label([...label], []), h.textarea([...textarea]), h.p([...description], [])],
                ),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#bio", seen.textarea),
      inline("label", seen.label),
      inline("#bio-description", seen.description),
    );
  }

  expect(sorted(seen.textarea)).toEqual(sorted(none));
  expect(sorted(seen.label)).toEqual(sorted(none));
  expect(sorted(seen.description)).toEqual(sorted(none));
});
