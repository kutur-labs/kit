import type { HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { CheckboxStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isChecked: { color: "red" },
  isIndeterminate: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  isReadOnly: { cursor: "default" },
  label: { textDecorationLine: "underline" },
  description: { fontStyle: "italic" },
  later: { color: "blue" },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, {
  checkbox: (state) => [
    state.isChecked && styles.isChecked,
    state.isIndeterminate && styles.isIndeterminate,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
  ],
  label: styles.label,
  description: styles.description,
});

// The optional config this test varies, left out where it checks the defaults.
type Model = Pick<
  Checkbox.ViewConfig<boolean>,
  "isChecked" | "isIndeterminate" | "isDisabled" | "isReadOnly"
>;

// The checked state the click asks for is the whole Message.
const viewWith = (styledView: typeof checkboxView) => (model: Model, h: HtmlBuilder<boolean>) =>
  styledView(
    {
      ...model,
      id: "terms",
      hasDescription: true,
      onToggle: (isChecked) => isChecked,
      toView: ({ checkbox, label, description }) =>
        h.div(
          [],
          [
            h.button([...checkbox], []),
            h.label([...label], ["Terms"]),
            h.p([...description], ["Required"]),
          ],
        ),
    },
    h,
  );

const view = viewWith(checkboxView);

const update = (model: Model, isChecked: boolean) => ({ model: { ...model, isChecked } });

const unset: Model = { isChecked: false };

const checkbox = Scene.role("checkbox");

describe("CheckboxStyle.view", () => {
  // Each flag both ways; checked and indeterminate together, where @foldkit/ui sets only one hook.
  const scenarios: ReadonlyArray<Model> = [
    unset,
    { ...unset, isChecked: true },
    { ...unset, isIndeterminate: true },
    { ...unset, isChecked: true, isIndeterminate: true },
    { isChecked: false, isIndeterminate: false, isDisabled: false, isReadOnly: false },
    { ...unset, isDisabled: true },
    { ...unset, isReadOnly: true },
  ];

  for (const model of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(
          checkbox,
          "data-checked",
          styles.isChecked,
          model.isChecked && model.isIndeterminate !== true,
        ),
        ...agrees(
          checkbox,
          "data-indeterminate",
          styles.isIndeterminate,
          model.isIndeterminate === true,
        ),
        ...agrees(checkbox, "data-disabled", styles.isDisabled, model.isDisabled === true),
        ...agrees(checkbox, "data-readonly", styles.isReadOnly, model.isReadOnly === true),
      );
    });
  }

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(Scene.selector("#terms-label")).toHaveClass(classOf(styles.label)),
      Scene.expect(Scene.selector("#terms-description")).toHaveClass(classOf(styles.description)),
    );
  });

  // `isChecked` and `later` set the same property, so StyleX keeps only the later layer's class.
  for (const [name, layered] of [
    [
      "static, then stateful",
      CheckboxStyle.view(
        Checkbox.view,
        { checkbox: styles.isChecked },
        { checkbox: () => styles.later },
      ),
    ],
    [
      "stateful, then static",
      CheckboxStyle.view(
        Checkbox.view,
        { checkbox: () => styles.isChecked },
        { checkbox: styles.later },
      ),
    ],
  ] as const) {
    it(`lets a later styles object win property by property: ${name}`, () => {
      Scene.scene(
        { update, view: viewWith(layered) },
        Scene.given(unset),
        Scene.expect(checkbox).toHaveClass(classOf(styles.later)),
        Scene.expect(checkbox).not.toHaveClass(classOf(styles.isChecked)),
      );
    });
  }

  it("still toggles from a click", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(checkbox),
      Scene.expect(checkbox).toHaveAttr("data-checked"),
      Scene.expect(checkbox).toHaveClass(classOf(styles.isChecked)),
    );
  });
});
