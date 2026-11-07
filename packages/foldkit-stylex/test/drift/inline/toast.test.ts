import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Toast as Ui } from "@foldkit/ui";
import { Schema } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Toast's container owns in every position, and its swipeable entries", () => {
  const container = owns<Own.ToastContainer>()(
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

  // Entries also take `translate` while a swipe moves them, which Own.ToastEntry lists.
  const entry = owns<Own.ToastEntry>()("pointerEvents", "touchAction");
  const seen = { container: new Set<string>(), entry: new Set<string>() };
  const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

  const shown = Toast.show(Toast.init({ id: "notifications", swipeToDismiss: {} }), {
    payload: { text: "Saved" },
    sticky: true,
  }).model;

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

  expect(sorted(seen.container)).toEqual(sorted(container));
  expect(sorted(seen.entry)).toEqual(sorted(entry));
});
