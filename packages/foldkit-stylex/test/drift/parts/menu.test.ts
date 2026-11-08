import type { Html, HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { MenuStyle } from "../../../src/index.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs MenuStyle fills", () => {
  const passed = new Set<string>();

  // Stands in for Menu's view and records the inputs MenuStyle passes it.
  const recordingView = (
    _model: Menu.Model,
    inputs: Menu.ViewInputs<"copy">,
    h: HtmlBuilder<Menu.Message>,
  ): Html => {
    for (const input of Object.keys(inputs)) {
      passed.add(input);
    }

    return h.div([], []);
  };

  const styledView = MenuStyle.view(recordingView);

  Scene.scene(
    {
      update: (model: Menu.Model) => ({ model }),
      view: (model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
        styledView(
          model,
          {
            items: ["copy"],
            buttonContent: h.span([], []),
            itemToConfig: () => ({ content: h.span([], []) }),
          },
          h,
        ),
    },
    Scene.given(Menu.init({ id: "actions" })),
  );

  const filled = [...passed].filter(
    (input) => input.endsWith("ClassName") || input === "className",
  );

  expect(declaredClassNames("./menu/index.d.ts")).toEqual(filled.sort());
});
