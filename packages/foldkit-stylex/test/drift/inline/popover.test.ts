import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Popover's open trigger and panel own, and nothing on its backdrop and arrow", () => {
  const button = owns<Own.Owns["Popover"]["button"]>()("position", "zIndex");
  const panel = owns<Own.Owns["Popover"]["panel"]>()("position", "margin", "visibility");
  // This package sets what the backdrop and arrow own.
  const backdrop = owns<Own.Owns["Popover"]["backdrop"]>()();
  const arrow = owns<Own.Owns["Popover"]["arrow"]>()();

  const seen = {
    button: new Set<string>(),
    panel: new Set<string>(),
    backdrop: new Set<string>(),
    arrow: new Set<string>(),
  };

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
              h.div(
                [],
                [
                  h.button([...render.button], []),
                  h.div([...render.backdrop, h.Id("backdrop")]),
                  h.div([...render.panel], [h.div([...render.arrow, h.Id("arrow")])]),
                ],
              ),
          },
          h,
        ),
    },
    Scene.given(Popover.update(closed, Popover.Message.RequestedOpen()).model),
    inline("#help-button", seen.button),
    inline("#help-panel", seen.panel),
    inline("#backdrop", seen.backdrop),
    inline("#arrow", seen.arrow),
    Scene.Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover()),
    Scene.Mount.resolve(
      Popover.PortalPopoverBackdrop,
      Popover.Message.CompletedPortalPopoverBackdrop(),
    ),
  );

  expect(sorted(seen.button)).toEqual(sorted(button));
  expect(sorted(seen.panel)).toEqual(sorted(panel));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
  expect(sorted(seen.arrow)).toEqual(sorted(arrow));
});
