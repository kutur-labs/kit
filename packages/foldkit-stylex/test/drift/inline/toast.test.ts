import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Toast as Ui } from "@foldkit/ui";
import { Array, Option, Schema } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Toast's container owns in every position, and its entries at rest and mid-swipe", () => {
  const container = owns<Own.Owns["Toast"]["container"]>()(
    "position",
    "display",
    "flexDirection",
    "gap",
    "padding",
    "pointerEvents",
    "zIndex",
    "top",
    "bottom",
    "left",
    "right",
    "transform",
  );

  const entry = owns<Own.Owns["Toast"]["entry"]>()("pointerEvents", "touchAction");
  const swiped = owns<Own.Owns["Toast"]["entry"]>()("pointerEvents", "touchAction", "translate");

  const seen = {
    container: new Set<string>(),
    entry: new Set<string>(),
    swiped: new Set<string>(),
  };

  const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

  const shown = Toast.show(Toast.init({ id: "notifications", swipeToDismiss: {} }), {
    payload: { text: "Saved" },
    sticky: true,
  }).model;

  const { id: entryId } = Option.getOrThrow(Array.head(shown.entries));

  // The entry while a pointer drags it 40px to the right.
  const swiping = [
    Toast.Message.PressedEntryPointer({ entryId, pointerId: 1, clientX: 0 }),
    Toast.Message.MovedSwipePointer({ pointerId: 1, clientX: 40 }),
  ].reduce((model, message) => Toast.update(model, message).model, shown);

  const positions: ReadonlyArray<Ui.Position> = [
    "TopLeft",
    "TopCenter",
    "TopRight",
    "BottomLeft",
    "BottomCenter",
    "BottomRight",
  ];

  for (const position of positions) {
    Scene.scene(
      {
        update: (model: typeof Toast.Model.Type) => ({ model }),
        view: (model: typeof Toast.Model.Type, h: HtmlBuilder<typeof Toast.Message.Type>) =>
          Toast.view(model, { position, entryToView: () => h.div([], []) }, h),
      },
      Scene.given(shown),
      inline("#notifications", seen.container),
      inline("[data-variant]", seen.entry),
    );
  }

  Scene.scene(
    {
      update: (model: typeof Toast.Model.Type) => ({ model }),
      view: (model: typeof Toast.Model.Type, h: HtmlBuilder<typeof Toast.Message.Type>) =>
        Toast.view(model, { position: "BottomRight", entryToView: () => h.div([], []) }, h),
    },
    Scene.given(swiping),
    inline("[data-variant]", seen.swiped),
  );

  expect(sorted(seen.container)).toEqual(sorted(container));
  expect(sorted(seen.entry)).toEqual(sorted(entry));
  expect(sorted(seen.swiped)).toEqual(sorted(swiped));
});
