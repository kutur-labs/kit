import type { SwitchStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Switch } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts SwitchStyle styles", () => {
  const parts = ["button", "label", "description"] satisfies ReadonlyArray<
    keyof SwitchStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<boolean>) =>
        Switch.view(
          {
            id: "alerts",
            isChecked: false,
            onToggle: (isChecked) => isChecked,
            toView: (attributes) => keysOf(attributes, h),
          },
          h,
        ),
    },
    Scene.given(null),
    // A hidden form input, which renders nothing to style.
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts, "hiddenInput")),
  );
});
