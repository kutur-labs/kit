import type { ToastStyle } from "../../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Toast as Ui } from "@foldkit/ui";
import { Schema } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { declaredClassNames, expected, keys, keysOf } from "./bundles.ts";

it("@foldkit/ui renders the parts ToastStyle styles and declares the class names it fills", () => {
  const parts = ["dismiss"] satisfies ReadonlyArray<keyof ToastStyle.Styles>;

  const filled = ["containerClassName", "entryClassName"] satisfies ReadonlyArray<
    keyof ToastStyle.ViewInputs<unknown>
  >;

  const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

  const shown = Toast.show(Toast.init({ id: "notifications" }), {
    payload: { text: "Saved" },
    sticky: true,
  });

  Scene.scene(
    {
      update: (model: typeof Toast.Model.Type) => ({ model }),
      view: (model: typeof Toast.Model.Type, h: HtmlBuilder<typeof Toast.Message.Type>) =>
        Toast.view(
          model,
          { position: "BottomRight", entryToView: (_entry, handlers) => keysOf(handlers, h) },
          h,
        ),
    },
    Scene.given(shown.model),
    Scene.expect(keys).toHaveAttr("data-keys", expected(...parts)),
  );

  expect(declaredClassNames("./toast/index.d.ts")).toEqual([...filled].sort());
});
