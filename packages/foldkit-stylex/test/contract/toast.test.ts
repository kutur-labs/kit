import type { HtmlBuilder } from "foldkit/html";

import { Toast as Ui } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { ToastStyle } from "../../src/index.ts";
import { classOf, hasStyles } from "../classes.ts";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

type Model = typeof Toast.Model.Type;

type Message = typeof Toast.Message.Type;

const styles = stylex.create({
  container: { maxInlineSize: 320 },
  entry: { opacity: { default: 1, ":is([data-closed])": 0 } },
  dismiss: { minBlockSize: 44 },
  error: { color: "red" },
});

const toastView = ToastStyle.view(Toast.view, {
  container: styles.container,
  entry: styles.entry,
  dismiss: (state) => [styles.dismiss, state.variant === "Error" && styles.error],
});

const view = (model: Model, h: HtmlBuilder<Message>) =>
  toastView(
    model,
    {
      position: "BottomRight",
      entryToView: (entry, { dismiss }) =>
        h.div([], [h.p([], [entry.payload.text]), h.button([...dismiss], ["Dismiss"])]),
    },
    h,
  );

const update = (model: Model, message: Message) => ({ model: Toast.update(model, message).model });

const empty = Toast.init({ id: "notifications" });

const shown = (variant: Ui.Variant) =>
  Toast.show(empty, { payload: { text: "Saved" }, variant, sticky: true }).model;

describe("ToastStyle.view", () => {
  it("puts the container's and each entry's styles on @foldkit/ui's elements", () => {
    Scene.scene(
      { update, view },
      Scene.given(shown("Info")),
      ...hasStyles(Scene.selector("#notifications"), styles.container),
      ...hasStyles(Scene.selector("[data-variant]"), styles.entry),
    );
  });

  for (const variant of ["Info", "Error"] as const) {
    it(`styles dismiss from the entry's variant, which @foldkit/ui sets as data-variant: ${variant}`, () => {
      const dismiss = Scene.role("button");

      Scene.scene(
        { update, view },
        Scene.given(shown(variant)),
        Scene.expect(Scene.selector("[data-variant]")).toHaveAttr("data-variant", variant),
        ...hasStyles(dismiss, styles.dismiss),
        variant === "Error"
          ? Scene.expect(dismiss).toHaveClass(classOf(styles.error))
          : Scene.expect(dismiss).not.toHaveClass(classOf(styles.error)),
      );
    });
  }

  it("still starts an entry's leave from a click on its styled dismiss button", () => {
    Scene.scene(
      { update, view },
      Scene.given(shown("Info")),
      Scene.click(Scene.role("button")),
      Scene.expect(Scene.selector("[data-variant]")).toHaveAttr("data-leave"),
    );
  });
});
