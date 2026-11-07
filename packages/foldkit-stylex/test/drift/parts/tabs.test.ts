import type { TabsStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Tabs } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { bundleKeys, expected } from "./bundles.ts";

it("@foldkit/ui renders the parts TabsStyle styles", () => {
  const listParts = ["tablist"] satisfies ReadonlyArray<keyof TabsStyle.Styles>;
  const tabParts = ["tab", "panel"] satisfies ReadonlyArray<keyof TabsStyle.Styles>;
  const SectionTabs = Tabs.create<"Poems">();

  Scene.scene(
    {
      update: (model: Tabs.Model) => ({ model }),
      view: (model: Tabs.Model, h: HtmlBuilder<Tabs.Message>) =>
        SectionTabs.view(
          model,
          {
            tabs: ["Poems"],
            selectedValue: "Poems",
            ariaLabel: "Sections",
            toView: (render) =>
              h.div(
                [h.DataAttribute("keys", bundleKeys(render))],
                render.tabs.map((tab) =>
                  h.div([h.Id("tab"), h.DataAttribute("keys", bundleKeys(tab))], []),
                ),
              ),
          },
          h,
        ),
    },
    Scene.given(Tabs.init({ id: "sections" })),
    // `tabs` holds each tab's bundles, checked below.
    Scene.expect(Scene.selector("div[data-keys]")).toHaveAttr(
      "data-keys",
      expected(...listParts, "tabs"),
    ),
    Scene.expect(Scene.selector("#tab")).toHaveAttr("data-keys", expected(...tabParts)),
  );
});
