import type { HtmlBuilder } from "foldkit/html";

import { Animation } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { defineView } from "foldkit/submodel";
import { expect, it } from "vitest";

import { AnimationStyle } from "../../../src/index.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs AnimationStyle fills", () => {
  const passed = new Set<string>();

  // Stands in for Animation's view and records the inputs AnimationStyle passes it.
  const recordingView = defineView<Animation.Model, Animation.Message, Animation.ViewInputs>(
    (_model, inputs, h) => {
      for (const input of Object.keys(inputs)) {
        passed.add(input);
      }

      return h.div([], []);
    },
  );

  const styledView = AnimationStyle.view(recordingView);

  Scene.scene(
    {
      update: (model: Animation.Model) => ({ model }),
      view: (model: Animation.Model, h: HtmlBuilder<Animation.Message>) =>
        styledView(model, { content: h.p([], []) }, h),
    },
    Scene.given(Animation.init({ id: "note" })),
  );

  const filled = [...passed].filter(
    (input) => input.endsWith("ClassName") || input === "className",
  );

  expect(declaredClassNames("./animation/index.d.ts")).toEqual(filled.sort());
});
