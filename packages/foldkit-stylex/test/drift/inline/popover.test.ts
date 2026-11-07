import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Popover's open trigger and panel own", () => {
  const button = owns<Own.OpenTrigger>()("position", "zIndex");
  const panel = owns<Own.AnchoredPanel>()("position", "margin", "visibility");
  const seen = { button: new Set<string>(), panel: new Set<string>() };
  const closed = Popover.init({ id: "help" });

  Scene.scene(
    {
      update: (model: Popover.Model) => ({ model }),
      view: (model: Popover.Model, h: HtmlBuilder<Popover.Message>) =>
        Popover.view(
          model,
          {
            anchor: {},
            toView: (render) =>
              h.div([], [h.button([...render.button], []), h.div([...render.panel], [])]),
          },
          h,
        ),
    },
    Scene.given(Popover.update(closed, Popover.Message.RequestedOpen()).model),
    inline("#help-button", seen.button),
    inline("#help-panel", seen.panel),
    Scene.Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover()),
  );

  expect(sorted(seen.button)).toEqual(sorted(button));
  expect(sorted(seen.panel)).toEqual(sorted(panel));
});
