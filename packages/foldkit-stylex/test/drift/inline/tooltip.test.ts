import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Tooltip's panel owns, and nothing on its trigger", () => {
  const panel = owns<Own.TooltipPanel>()("position", "margin", "visibility", "pointerEvents");
  const seen = { trigger: new Set<string>(), panel: new Set<string>() };

  Scene.scene(
    {
      update: (model: Tooltip.Model) => ({ model }),
      view: (model: Tooltip.Model, h: HtmlBuilder<Tooltip.Message>) =>
        Tooltip.view(
          model,
          {
            anchor: {},
            toView: (render) =>
              h.div([], [h.button([...render.trigger], []), h.div([...render.panel], [])]),
          },
          h,
        ),
    },
    Scene.given({ ...Tooltip.init({ id: "save" }), isOpen: true }),
    inline("#save-trigger", seen.trigger),
    inline("#save-panel", seen.panel),
    Scene.Mount.resolve(Tooltip.AnchorTooltip, Tooltip.Message.CompletedAnchorTooltip()),
  );

  expect(sorted(seen.trigger)).toEqual([]);
  expect(sorted(seen.panel)).toEqual(sorted(panel));
});
