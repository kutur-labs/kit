import type { HtmlBuilder } from "foldkit/html";

import { Input } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { InputStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isDisabled: { opacity: 0.5 },
  isReadOnly: { cursor: "default" },
  isInvalid: { outlineColor: "red" },
  label: { fontWeight: 700 },
  description: { fontStyle: "italic" },
  base: { borderColor: "gray" },
  later: { borderColor: "red" },
});

const inputView = InputStyle.view(Input.view, {
  input: (state) => [
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
    state.isInvalid && styles.isInvalid,
  ],
  label: styles.label,
  description: styles.description,
});

// The optional config this test varies, left out where it checks the defaults, and the typed text.
type Model = Pick<Input.ViewConfig<string>, "isDisabled" | "isReadOnly" | "isInvalid"> &
  Readonly<{ value: string }>;

// The text the input reports is the whole Message.
const viewWith = (styledView: typeof inputView) => (model: Model, h: HtmlBuilder<string>) =>
  styledView(
    {
      ...model,
      id: "name",
      hasDescription: true,
      onInput: (value) => value,
      toView: ({ input, label, description }) =>
        h.div(
          [],
          [
            h.label([...label], ["Name"]),
            h.input([...input]),
            h.p([...description], ["As in your passport"]),
          ],
        ),
    },
    h,
  );

const view = viewWith(inputView);

const update = (model: Model, value: string) => ({ model: { ...model, value } });

const unset: Model = { value: "" };

const input = Scene.selector("#name");

describe("InputStyle.view", () => {
  const scenarios: ReadonlyArray<Model> = [
    unset,
    { ...unset, isDisabled: false, isReadOnly: false, isInvalid: false },
    { ...unset, isDisabled: true },
    { ...unset, isReadOnly: true },
    { ...unset, isInvalid: true },
    { ...unset, isDisabled: true, isReadOnly: true, isInvalid: true },
  ];

  for (const model of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(input, "data-disabled", styles.isDisabled, model.isDisabled === true),
        ...agrees(input, "data-readonly", styles.isReadOnly, model.isReadOnly === true),
        ...agrees(input, "data-invalid", styles.isInvalid, model.isInvalid === true),
      );
    });
  }

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(Scene.selector("label")).toHaveClass(classOf(styles.label)),
      Scene.expect(Scene.selector("#name-description")).toHaveClass(classOf(styles.description)),
    );
  });

  // `base` and `later` set the same property, so StyleX keeps only the class of the one that wins.
  const layered = viewWith(
    InputStyle.view(
      Input.view,
      { input: styles.base },
      { input: (state) => state.isInvalid && styles.later },
    ),
  );

  for (const isInvalid of [true, false]) {
    it(`lets a later state style win only in its state: isInvalid ${isInvalid}`, () => {
      const [winner, loser] = isInvalid ? [styles.later, styles.base] : [styles.base, styles.later];

      Scene.scene(
        { update, view: layered },
        Scene.given({ ...unset, isInvalid }),
        Scene.expect(input).toHaveClass(classOf(winner)),
        Scene.expect(input).not.toHaveClass(classOf(loser)),
      );
    });
  }

  it("still reports typed text", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.type(input, "Ada"),
      Scene.expect(input).toHaveValue("Ada"),
    );
  });
});
