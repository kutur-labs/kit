import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { DragAndDrop } from "@foldkit/ui";
import { Predicate } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what a draggable owns", () => {
  const draggable = owns<Own.Owns["DragAndDrop"]["draggable"]>()(
    "touchAction",
    "userSelect",
    "WebkitUserSelect",
  );

  const seen = new Set<string>();

  Scene.scene(
    {
      update: (model: DragAndDrop.Model) => ({ model }),
      view: (model: DragAndDrop.Model, h: HtmlBuilder<DragAndDrop.Message>) =>
        h.div(
          [
            h.Id("item"),
            ...DragAndDrop.draggable(
              {
                model,
                toParentMessage: (message) => message,
                itemId: "a",
                containerId: "list",
                index: 0,
              },
              h,
            ),
          ],
          [],
        ),
    },
    Scene.given(DragAndDrop.init({ id: "board" })),
    inline("#item", seen),
  );

  expect(sorted(seen)).toEqual(sorted(draggable));
});

it("@foldkit/ui's droppable and sortable set no class or inline style, so DragAndDropStyle leaves them unwrapped", () => {
  const styling = [...DragAndDrop.droppable("list", "Tasks"), ...DragAndDrop.sortable("a")].filter(
    (attribute) => Predicate.isTagged(attribute, "Class") || Predicate.isTagged(attribute, "Style"),
  );

  expect(
    styling,
    "@foldkit/ui now styles droppable or sortable. Wrap it in drag-and-drop-style.ts as draggable is, with an owned family for its inline properties.",
  ).toEqual([]);
});
