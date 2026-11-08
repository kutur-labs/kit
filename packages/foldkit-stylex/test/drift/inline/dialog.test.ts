import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Dialog's dialog element and backdrop own", () => {
  const dialog = owns<Own.Owns["Dialog"]["dialog"]>()(
    "width",
    "height",
    "maxWidth",
    "maxHeight",
    "padding",
    "border",
    "background",
    "position",
    "inset",
    "zIndex",
  );

  const backdrop = owns<Own.Owns["Dialog"]["backdrop"]>()("minHeight");
  const seen = { dialog: new Set<string>(), backdrop: new Set<string>() };

  Scene.scene(
    {
      update: (model: Dialog.Model) => ({ model }),
      view: (model: Dialog.Model, h: HtmlBuilder<Dialog.Message>) =>
        Dialog.view(
          model,
          {
            toView: (render) =>
              h.dialog([...render.dialog], [h.div([...render.backdrop, h.Id("backdrop")])]),
          },
          h,
        ),
    },
    Scene.given({ ...Dialog.init({ id: "confirm" }), isOpen: true }),
    inline("#confirm", seen.dialog),
    inline("#backdrop", seen.backdrop),
    Scene.Mount.resolve(Dialog.AcquireResources, Dialog.Message.SucceededAcquireResources()),
  );

  expect(sorted(seen.dialog)).toEqual(sorted(dialog));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
});
