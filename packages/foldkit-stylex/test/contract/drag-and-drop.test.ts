import type { SxStyles } from "../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { DragAndDrop } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { DragAndDropStyle } from "../../src/index.ts";
import { classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  draggable: { cursor: "grab" },
  isDragging: { opacity: 0.8 },
  isDragged: { outlineStyle: "dashed" },
});

const draggable = DragAndDropStyle.draggable(DragAndDrop.draggable, {
  draggable: (state) => [
    styles.draggable,
    state.isDragging && styles.isDragging,
    state.isDragged && styles.isDragged,
  ],
});

const items = ["a", "b"];

const view = (model: DragAndDrop.Model, h: HtmlBuilder<DragAndDrop.Message>) =>
  h.ul(
    [...DragAndDrop.droppable("list")],
    items.map((itemId, index) =>
      h.li(
        [
          h.Id(itemId),
          ...draggable(
            { model, toParentMessage: (message) => message, itemId, containerId: "list", index },
            h,
          ),
        ],
        [itemId],
      ),
    ),
  );

const update = (model: DragAndDrop.Model, message: DragAndDrop.Message) => ({
  model: DragAndDrop.update(model, message).model,
});

const after = (...messages: ReadonlyArray<DragAndDrop.Message>) =>
  messages.reduce(
    (model, message) => DragAndDrop.update(model, message).model,
    DragAndDrop.init({ id: "board" }),
  );

const pressed = DragAndDrop.Message.PressedDraggable({
  itemId: "a",
  containerId: "list",
  index: 0,
  screenX: 0,
  screenY: 0,
});

const moved = DragAndDrop.Message.MovedPointer({
  screenX: 0,
  screenY: 40,
  clientX: 0,
  clientY: 40,
  maybeDropTarget: Option.none(),
});

const flagOf = (locator: Scene.Locator, style: SxStyles, on: boolean) =>
  on
    ? Scene.expect(locator).toHaveClass(classOf(style))
    : Scene.expect(locator).not.toHaveClass(classOf(style));

describe("DragAndDropStyle.draggable", () => {
  const scenarios = [
    { name: "Idle", model: after(), isDragging: false },
    { name: "Pending", model: after(pressed), isDragging: false },
    { name: "Dragging", model: after(pressed, moved), isDragging: true },
    {
      name: "KeyboardDragging",
      model: after(
        DragAndDrop.Message.ActivatedKeyboardDrag({ itemId: "a", containerId: "list", index: 0 }),
      ),
      isDragging: true,
    },
  ];

  for (const { name, model, isDragging } of scenarios) {
    it(`sets isDragging and isDragged as @foldkit/ui's helpers report them: ${name}`, () => {
      expect(model.dragState._tag).toBe(name);
      expect(DragAndDrop.isDragging(model)).toBe(isDragging);
      expect(Option.getOrUndefined(DragAndDrop.maybeDraggedItemId(model))).toBe(
        name === "Idle" ? undefined : "a",
      );

      Scene.scene(
        { update, view },
        Scene.given(model),
        flagOf(Scene.selector("#a"), styles.isDragging, isDragging),
        flagOf(Scene.selector("#b"), styles.isDragging, isDragging),
        flagOf(Scene.selector("#a"), styles.isDragged, isDragging),
        flagOf(Scene.selector("#b"), styles.isDragged, false),
      );
    });
  }

  it("puts the draggable's styles after @foldkit/ui's attributes, which keep their inline style", () => {
    Scene.scene(
      { update, view },
      Scene.given(after()),
      ...hasStyles(Scene.selector("#a"), styles.draggable),
      Scene.expect(Scene.selector("#a")).toHaveStyle("touch-action", "none"),
      Scene.expect(Scene.selector("#a")).toHaveAttr("aria-roledescription", "draggable"),
    );
  });

  it("still starts a keyboard drag from Enter on the styled item", () => {
    Scene.scene(
      { update, view },
      Scene.given(after()),
      Scene.keydown(Scene.selector("#b"), "Enter"),
      flagOf(Scene.selector("#b"), styles.isDragged, true),
      flagOf(Scene.selector("#a"), styles.isDragged, false),
    );
  });
});
