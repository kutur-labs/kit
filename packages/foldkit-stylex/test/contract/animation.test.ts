import type { SxStyles } from "../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Animation } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { AnimationStyle } from "../../src/index.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  element: { transitionProperty: "opacity" },
  isShowing: { fontWeight: 700 },
  isClosed: { opacity: 0 },
});

const animationView = AnimationStyle.view(Animation.view, {
  element: (state) => [
    styles.element,
    state.isShowing && styles.isShowing,
    state.isClosed && styles.isClosed,
  ],
});

type Model = Readonly<{ animation: Animation.Model; animateSize: boolean }>;

const view = (model: Model, h: HtmlBuilder<Animation.Message>) =>
  h.div(
    [],
    [
      h.button([h.Id("show"), h.OnClick(Animation.Message.Showed())], ["Show"]),
      animationView(
        model.animation,
        { content: h.p([], ["Saved."]), animateSize: model.animateSize },
        h,
      ),
    ],
  );

const update = (model: Model, message: Animation.Message) => {
  const next = Animation.update(model.animation, message);

  return { model: { ...model, animation: next.model }, commands: next.commands ?? [] };
};

const hidden = Animation.init({ id: "note" });

const at = (transitionState: Animation.TransitionState, isShowing: boolean) => ({
  ...hidden,
  isShowing,
  transitionState,
});

const element = Scene.selector("#note");

const flag = (style: SxStyles, on: boolean) =>
  on
    ? Scene.expect(element).toHaveClass(classOf(style))
    : Scene.expect(element).not.toHaveClass(classOf(style));

describe("AnimationStyle.view", () => {
  const scenarios = [
    { name: "hidden", animation: hidden, isShowing: false, isClosed: true },
    { name: "EnterStart", animation: at("EnterStart", true), isShowing: true, isClosed: true },
    {
      name: "EnterAnimating",
      animation: at("EnterAnimating", true),
      isShowing: true,
      isClosed: false,
    },
    { name: "shown", animation: at("Idle", true), isShowing: true, isClosed: false },
    { name: "LeaveStart", animation: at("LeaveStart", false), isShowing: false, isClosed: false },
    {
      name: "LeaveAnimating",
      animation: at("LeaveAnimating", false),
      isShowing: false,
      isClosed: true,
    },
  ];

  for (const animateSize of [false, true]) {
    for (const { name, animation, isShowing, isClosed } of scenarios) {
      // Without animateSize, @foldkit/ui renders nothing while hidden.
      const isRendered = animateSize || name !== "hidden";

      it(`sets isClosed where @foldkit/ui sets data-closed, and isShowing from the model: ${name}, animateSize ${String(animateSize)}`, () => {
        Scene.scene(
          { update, view },
          Scene.given({ animation, animateSize }),
          ...(isRendered
            ? [
                ...agrees(element, "data-closed", styles.isClosed, isClosed),
                flag(styles.isShowing, isShowing),
              ]
            : [Scene.expect(element).toBeAbsent()]),
        );
      });
    }
  }

  it("puts the element's styles on it", () => {
    Scene.scene(
      { update, view },
      Scene.given({ animation: at("Idle", true), animateSize: false }),
      ...hasStyles(element, styles.element),
    );
  });

  it("still plays the enter animation after a show", () => {
    Scene.scene(
      { update, view },
      Scene.given({ animation: hidden, animateSize: false }),
      Scene.click(Scene.selector("#show")),
      Scene.expect(element).toHaveAttr("data-enter"),
      flag(styles.isClosed, true),
      Scene.Command.resolve(
        Animation.WaitForPaint,
        Animation.Message.CompletedWaitForPaint({ generation: 1 }),
      ),
      flag(styles.isClosed, false),
      Scene.Command.resolve(
        Animation.WaitForAnimationSettled,
        Animation.Message.EndedAnimation({ generation: 1 }),
      ),
      Scene.expect(element).not.toHaveAttr("data-enter"),
      flag(styles.isShowing, true),
    );
  });
});
