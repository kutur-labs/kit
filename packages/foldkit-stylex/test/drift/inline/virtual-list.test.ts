import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what VirtualList's container owns", () => {
  const container = owns<Own.Owns["VirtualList"]["container"]>()(
    "overflow",
    "overflowAnchor",
    "listStyle",
    "margin",
    "padding",
  );

  const seen = new Set<string>();

  Scene.scene(
    {
      update: (model: VirtualList.Model) => ({ model }),
      view: (model: VirtualList.Model, h: HtmlBuilder<VirtualList.Message>) =>
        VirtualList.view<string>()(
          model,
          { items: ["a"], itemToKey: (item) => item, itemToView: (item) => h.span([], [item]) },
          h,
        ),
    },
    Scene.given(VirtualList.init({ id: "rows", rowHeightPx: 20 })),
    inline("#rows", seen),
    Scene.Mount.resolve(
      { name: "ObserveVirtualList" },
      VirtualList.Message.ResizedContainer({ containerWidth: 320, containerHeight: 60 }),
    ),
  );

  expect(sorted(seen)).toEqual(sorted(container));
});
