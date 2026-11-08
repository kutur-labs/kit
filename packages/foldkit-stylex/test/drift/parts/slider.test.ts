import type { SliderStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts SliderStyle styles", () => {
  const parts = ["root", "label", "track", "filledTrack", "thumb"] satisfies ReadonlyArray<
    keyof SliderStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: Slider.Model) => ({ model }),
      view: (model: Slider.Model, h: HtmlBuilder<Slider.Message>) =>
        Slider.view(model, { value: 0, toView: (attributes) => keysOf(attributes, h) }, h),
    },
    Scene.given(Slider.init({ id: "volume", min: 0, max: 1, step: 1 })),
    // A hidden form input, which renders nothing to style.
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts, "hiddenInput")),
  );
});
