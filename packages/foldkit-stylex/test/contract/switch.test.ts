import type { HtmlBuilder } from "foldkit/html";

import { Switch } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { SwitchStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isChecked: { color: "red" },
  isDisabled: { opacity: 0.5 },
  isReadOnly: { cursor: "default" },
  label: { textDecorationLine: "underline" },
  description: { fontStyle: "italic" },
  later: { color: "blue" },
});

const switchView = SwitchStyle.view(Switch.view, {
  button: (state) => [
    state.isChecked && styles.isChecked,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
  ],
  label: styles.label,
  description: styles.description,
});

// The optional config this test varies, left out where it checks the defaults.
type Model = Pick<Switch.ViewConfig<boolean>, "isChecked" | "isDisabled" | "isReadOnly">;

// The checked state the click asks for is the whole Message.
const viewWith = (styledView: typeof switchView) => (model: Model, h: HtmlBuilder<boolean>) =>
  styledView(
    {
      ...model,
      id: "alerts",
      hasDescription: true,
      onToggle: (isChecked) => isChecked,
      toView: ({ button, label, description }) =>
        h.div(
          [],
          [
            h.button([...button], []),
            h.label([...label], ["Alerts"]),
            h.p([...description], ["By email"]),
          ],
        ),
    },
    h,
  );

const view = viewWith(switchView);

const update = (model: Model, isChecked: boolean) => ({ model: { ...model, isChecked } });

const unset: Model = { isChecked: false };

const button = Scene.role("switch");

describe("SwitchStyle.view", () => {
  const scenarios: ReadonlyArray<Model> = [
    unset,
    { ...unset, isChecked: true },
    { isChecked: false, isDisabled: false, isReadOnly: false },
    { ...unset, isDisabled: true },
    { ...unset, isReadOnly: true },
  ];

  for (const model of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(button, "data-checked", styles.isChecked, model.isChecked),
        ...agrees(button, "data-disabled", styles.isDisabled, model.isDisabled === true),
        ...agrees(button, "data-readonly", styles.isReadOnly, model.isReadOnly === true),
      );
    });
  }

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(Scene.selector("#alerts-label")).toHaveClass(classOf(styles.label)),
      Scene.expect(Scene.selector("#alerts-description")).toHaveClass(classOf(styles.description)),
    );
  });

  // `isChecked` and `later` set the same property, so StyleX keeps only the later layer's class.
  for (const [name, layered] of [
    [
      "static, then stateful",
      SwitchStyle.view(Switch.view, { button: styles.isChecked }, { button: () => styles.later }),
    ],
    [
      "stateful, then static",
      SwitchStyle.view(Switch.view, { button: () => styles.isChecked }, { button: styles.later }),
    ],
  ] as const) {
    it(`lets a later styles object win property by property: ${name}`, () => {
      Scene.scene(
        { update, view: viewWith(layered) },
        Scene.given(unset),
        Scene.expect(button).toHaveClass(classOf(styles.later)),
        Scene.expect(button).not.toHaveClass(classOf(styles.isChecked)),
      );
    });
  }

  it("still toggles from a click on the label", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(Scene.selector("#alerts-label")),
      Scene.expect(button).toHaveAttr("data-checked"),
      Scene.expect(button).toHaveClass(classOf(styles.isChecked)),
    );
  });
});
