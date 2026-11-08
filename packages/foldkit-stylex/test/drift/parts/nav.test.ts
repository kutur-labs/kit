import type { NavStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Nav } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { bundleKeys, expected } from "./bundles.ts";

it("@foldkit/ui renders the parts NavStyle styles", () => {
  const navParts = ["nav"] satisfies ReadonlyArray<keyof NavStyle.Styles>;
  const itemParts = ["link"] satisfies ReadonlyArray<keyof NavStyle.Styles>;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) =>
        Nav.view({
          items: ["poems"],
          ariaLabel: "Sections",
          toHref: (value) => `/${value}`,
          isItemCurrent: () => true,
          toView: (render) =>
            h.div(
              [h.DataAttribute("keys", bundleKeys(render))],
              render.items.map((item) =>
                h.div([h.Id("item"), h.DataAttribute("keys", bundleKeys(item))], []),
              ),
            ),
        }),
    },
    Scene.given(null),
    // `items` holds each link's bundle, checked below.
    Scene.expect(Scene.selector("div[data-keys]")).toHaveAttr(
      "data-keys",
      expected(...navParts, "items"),
    ),
    Scene.expect(Scene.selector("#item")).toHaveAttr("data-keys", expected(...itemParts)),
  );
});
