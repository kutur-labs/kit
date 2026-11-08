import type { HtmlBuilder } from "foldkit/html";

import { RadioGroup } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { RadioGroupStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isHorizontal: { flexDirection: "row" },
  isSelected: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  isReadOnly: { cursor: "default" },
  labelSelected: { textDecorationLine: "underline" },
  descriptionSelected: { fontStyle: "italic" },
});

type Plan = "Free" | "Pro" | "Team";

const Plans = RadioGroup.create<Plan>();

const radioGroupView = RadioGroupStyle.view(Plans.view, {
  group: (state) => [
    state.orientation === "Horizontal" && styles.isHorizontal,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
  ],
  option: (state) => [
    state.isSelected && styles.isSelected,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
  ],
  label: (state) => state.isSelected && styles.labelSelected,
  description: (state) => state.isSelected && styles.descriptionSelected,
});

// The optional inputs this test varies, left out where it checks their defaults.
type Model = Readonly<{
  radio: RadioGroup.Model;
  selected: Plan;
  inputs: Pick<RadioGroup.ViewInputs, "orientation" | "isDisabled" | "isReadOnly">;
}>;

const view = (model: Model, h: HtmlBuilder<RadioGroup.Message>) =>
  radioGroupView(
    model.radio,
    {
      options: ["Free", "Pro", "Team"],
      selectedValue: Option.some(model.selected),
      ariaLabel: "Plan",
      ...model.inputs,
      isOptionDisabled: (value) => value === "Team",
      hasOptionDescription: () => true,
      toView: ({ group, options }) =>
        h.div(
          [...group, h.Id("group")],
          options.map((option) =>
            h.button(
              [...option.option],
              [h.span([...option.label], [option.value]), h.span([...option.description], [])],
            ),
          ),
        ),
    },
    h,
  );

const update = (model: Model, message: RadioGroup.Message) => {
  const next = Plans.update(model.radio, message);

  return {
    model: { ...model, radio: next.model, selected: next.outMessage?.value ?? model.selected },
  };
};

const unset: Model = { radio: RadioGroup.init({ id: "plan" }), selected: "Free", inputs: {} };

// Keyboard focus on Pro while Free stays selected, as after arrowing through a read-only group, so
// the roving `data-active` differs from `data-checked`.
const focusedAway: Model = {
  ...unset,
  radio: { ...unset.radio, maybeFocusedIndex: Option.some(1) },
};

const group = Scene.selector("#group");

const option = (index: number) => Scene.selector(`#plan-option-${index}`);

// Steps asserting that option `index`, its label and its description get `isSelected` exactly
// where @foldkit/ui sets `data-checked` on the option.
const selected = (index: number, isSelected: boolean) => [
  ...agrees(option(index), "data-checked", styles.isSelected, isSelected),
  isSelected
    ? Scene.expect(Scene.selector(`#plan-option-${index}-label`)).toHaveClass(
        classOf(styles.labelSelected),
      )
    : Scene.expect(Scene.selector(`#plan-option-${index}-label`)).not.toHaveClass(
        classOf(styles.labelSelected),
      ),
  isSelected
    ? Scene.expect(Scene.selector(`#plan-option-${index}-description`)).toHaveClass(
        classOf(styles.descriptionSelected),
      )
    : Scene.expect(Scene.selector(`#plan-option-${index}-description`)).not.toHaveClass(
        classOf(styles.descriptionSelected),
      ),
];

describe("RadioGroupStyle.view", () => {
  for (const inputs of [
    {},
    { isDisabled: false, isReadOnly: false },
    { isDisabled: true },
    { isReadOnly: true },
  ]) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(inputs)}`, () => {
      const isDisabled = inputs.isDisabled === true;
      const isReadOnly = inputs.isReadOnly === true;

      Scene.scene(
        { update, view },
        Scene.given({ ...focusedAway, inputs }),
        // A disabled group has no option to focus, so its tab stop falls back to the first.
        ...(isDisabled ? [] : [Scene.expect(option(1)).toHaveAttr("data-active")]),
        ...agrees(group, "data-readonly", styles.isReadOnly, isReadOnly),
        // @foldkit/ui marks a disabled group on its options only.
        isDisabled
          ? Scene.expect(group).toHaveClass(classOf(styles.isDisabled))
          : Scene.expect(group).not.toHaveClass(classOf(styles.isDisabled)),
        ...selected(0, true),
        ...selected(1, false),
        ...selected(2, false),
        // Team is disabled through isOptionDisabled.
        ...[0, 1, 2].flatMap((index) => [
          ...agrees(option(index), "data-disabled", styles.isDisabled, isDisabled || index === 2),
          ...agrees(option(index), "data-readonly", styles.isReadOnly, isReadOnly),
        ]),
      );
    });
  }

  for (const [inputs, orientation] of [
    [{}, "vertical"],
    [{ orientation: "Horizontal" }, "horizontal"],
    [{ orientation: "Vertical" }, "vertical"],
  ] as const) {
    it(`sets orientation where @foldkit/ui sets aria-orientation: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ ...unset, inputs }),
        Scene.expect(group).toHaveAttr("aria-orientation", orientation),
        orientation === "horizontal"
          ? Scene.expect(group).toHaveClass(classOf(styles.isHorizontal))
          : Scene.expect(group).not.toHaveClass(classOf(styles.isHorizontal)),
      );
    });
  }

  it("still selects an option from a click, moving isSelected with data-checked", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(option(1)),
      ...selected(0, false),
      ...selected(1, true),
    );
  });
});
