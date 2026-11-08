import type { CheckboxStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts CheckboxStyle styles", () => {
  const parts = ["checkbox", "label", "description"] satisfies ReadonlyArray<
    keyof CheckboxStyle.Styles
  >;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<boolean>) =>
        Checkbox.view(
          {
            id: "terms",
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
