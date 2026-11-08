import type { HtmlBuilder } from "foldkit/html";

import { Button } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { ButtonStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  base: { color: "red" },
  isDisabled: { opacity: 0.5 },
  later: { color: "blue" },
});

const buttonView = ButtonStyle.view(Button.view, {
  button: (state) => [styles.base, state.isDisabled && styles.isDisabled],
});

// `isDisabled` is the config this test varies, left out where it checks the default.
type Model = Readonly<{ isDisabled?: boolean; clicks: number }>;

// Every click sends `true`, the whole Message.
const viewWith =
  (styledView: typeof buttonView) =>
  ({ clicks, ...config }: Model, h: HtmlBuilder<boolean>) =>
    styledView(
      { ...config, onClick: true, toView: ({ button }) => h.button([...button], [`${clicks}`]) },
      h,
    );

const view = viewWith(buttonView);

const update = (model: Model) => ({ model: { ...model, clicks: model.clicks + 1 } });

const unset: Model = { clicks: 0 };

const button = Scene.role("button");

describe("ButtonStyle.view", () => {
  for (const model of [unset, { ...unset, isDisabled: false }, { ...unset, isDisabled: true }]) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(button, "data-disabled", styles.isDisabled, model.isDisabled === true),
      );
    });
  }

  // `base` and `later` set the same property, so StyleX keeps only the later layer's class.
  for (const [name, layered] of [
    [
      "static, then stateful",
      ButtonStyle.view(Button.view, { button: styles.base }, { button: () => styles.later }),
    ],
    [
      "stateful, then static",
      ButtonStyle.view(Button.view, { button: () => styles.base }, { button: styles.later }),
    ],
  ] as const) {
    it(`lets a later styles object win property by property: ${name}`, () => {
      Scene.scene(
        { update, view: viewWith(layered) },
        Scene.given(unset),
        Scene.expect(button).toHaveClass(classOf(styles.later)),
        Scene.expect(button).not.toHaveClass(classOf(styles.base)),
      );
    });
  }

  it("still dispatches onClick from a click", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(button),
      Scene.expect(button).toHaveText("1"),
      Scene.expect(button).toHaveClass(classOf(styles.base)),
    );
  });
});
