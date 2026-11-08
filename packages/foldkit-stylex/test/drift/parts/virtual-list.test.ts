import type { HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { defineView } from "foldkit/submodel";
import { expect, it } from "vitest";

import { VirtualListStyle } from "../../../src/index.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs VirtualListStyle fills", () => {
  const passed = new Set<string>();

  // Stands in for VirtualList's view and records the inputs VirtualListStyle passes it.
  const recordingView = defineView<
    VirtualList.Model,
    VirtualList.Message,
    VirtualList.ViewInputs<string>
  >((_model, inputs, h) => {
    for (const input of Object.keys(inputs)) {
      passed.add(input);
    }

    return h.div([], []);
  });

  const styledView = VirtualListStyle.view(recordingView);

  Scene.scene(
    {
      update: (model: VirtualList.Model) => ({ model }),
      view: (model: VirtualList.Model, h: HtmlBuilder<VirtualList.Message>) =>
        styledView(
          model,
          { items: ["a"], itemToKey: (item) => item, itemToView: (item) => h.span([], [item]) },
          h,
        ),
    },
    Scene.given(VirtualList.init({ id: "rows", rowHeightPx: 20 })),
  );

  const filled = [...passed].filter(
    (input) => input.endsWith("ClassName") || input === "className",
  );

  expect(declaredClassNames("./virtualList/index.d.ts")).toEqual(filled.sort());
});
