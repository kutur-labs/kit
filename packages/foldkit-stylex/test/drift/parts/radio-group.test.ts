import type { RadioGroupStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { RadioGroup } from "@foldkit/ui";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { bundleKeys, expected } from "./bundles.ts";

it("@foldkit/ui renders the parts RadioGroupStyle styles", () => {
  const groupParts = ["group"] satisfies ReadonlyArray<keyof RadioGroupStyle.Styles>;

  const optionParts = ["option", "label", "description"] satisfies ReadonlyArray<
    keyof RadioGroupStyle.Styles
  >;

  const Plans = RadioGroup.create<"Free">();

  Scene.scene(
    {
      update: (model: RadioGroup.Model) => ({ model }),
      view: (model: RadioGroup.Model, h: HtmlBuilder<RadioGroup.Message>) =>
        Plans.view(
          model,
          {
            options: ["Free"],
            selectedValue: Option.none(),
            ariaLabel: "Plan",
            toView: (render) =>
              h.div(
                [h.DataAttribute("keys", bundleKeys(render))],
                render.options.map((option) =>
                  h.div([h.Id("option"), h.DataAttribute("keys", bundleKeys(option))], []),
                ),
              ),
          },
          h,
        ),
    },
    Scene.given(RadioGroup.init({ id: "plan" })),
    // `options` holds each option's bundles, checked below; a hidden form input renders nothing to
    // style.
    Scene.expect(Scene.selector("div[data-keys]")).toHaveAttr(
      "data-keys",
      expected(...groupParts, "options", "hiddenInput"),
    ),
    Scene.expect(Scene.selector("#option")).toHaveAttr("data-keys", expected(...optionParts)),
  );
});
