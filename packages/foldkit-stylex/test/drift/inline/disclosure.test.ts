import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

// animatePanel writes its height animation inline on two wrappers that are not parts, so the
// panel inside them keeps every property it sets.
it("@foldkit/ui writes nothing inline on Disclosure's button and the panel inside animatePanel", () => {
  const none = owns<Own.None>()();
  const seen = { button: new Set<string>(), panel: new Set<string>() };

  for (const isOpen of [false, true]) {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<boolean>) =>
          Disclosure.view(
            {
              id: "notes",
              isOpen,
              onToggle: (next) => next,
              toView: ({ button, panel, animatePanel }) =>
                h.div(
                  [],
                  [h.button([...button], []), animatePanel(h.div([...panel]), { peek: "2em" })],
                ),
            },
            h,
          ),
      },
      Scene.given(null),
      inline("#notes-button", seen.button),
      inline("#notes-panel", seen.panel),
    );
  }

  expect(sorted(seen.button)).toEqual(sorted(none));
  expect(sorted(seen.panel)).toEqual(sorted(none));
});
