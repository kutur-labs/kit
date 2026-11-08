import type { DisclosureStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { it } from "vitest";

import { expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts DisclosureStyle styles", () => {
  const parts = ["button", "panel"] satisfies ReadonlyArray<keyof DisclosureStyle.Styles>;

  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<boolean>) =>
        Disclosure.view(
          {
            id: "notes",
            isOpen: false,
            onToggle: (isOpen) => isOpen,
            toView: (attributes) => keysOf(attributes, h),
          },
          h,
        ),
    },
    Scene.given(null),
    // `animatePanel` is a function that wraps the panel, not a bundle.
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );
});
