import type { HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { SelectStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isDisabled: { opacity: 0.5 },
  isInvalid: { outlineColor: "red" },
  label: { fontWeight: 700 },
  description: { fontStyle: "italic" },
  base: { borderColor: "gray" },
  later: { borderColor: "red" },
});

const selectView = SelectStyle.view(Select.view, {
  select: (state) => [state.isDisabled && styles.isDisabled, state.isInvalid && styles.isInvalid],
  label: styles.label,
  description: styles.description,
});

// The optional config this test varies, left out where it checks the defaults, and the chosen value.
type Model = Pick<Select.ViewConfig<string>, "isDisabled" | "isInvalid"> &
  Readonly<{ value: string }>;

// The value the select reports is the whole Message.
const viewWith = (styledView: typeof selectView) => (model: Model, h: HtmlBuilder<string>) =>
  styledView(
    {
      ...model,
      id: "language",
      hasDescription: true,
      onChange: (value) => value,
      toView: ({ select, label, description }) =>
        h.div(
          [],
          [
            h.label([...label], ["Language"]),
            h.select(
              [...select],
              [h.option([h.Value("pl")], ["Polski"]), h.option([h.Value("en")], ["English"])],
            ),
            h.p([...description], ["For the menus"]),
          ],
        ),
    },
    h,
  );

const view = viewWith(selectView);

const update = (model: Model, value: string) => ({ model: { ...model, value } });

const unset: Model = { value: "pl" };

const select = Scene.selector("#language");

describe("SelectStyle.view", () => {
  const scenarios: ReadonlyArray<Model> = [
    unset,
    { ...unset, isDisabled: false, isInvalid: false },
    { ...unset, isDisabled: true },
    { ...unset, isInvalid: true },
    { ...unset, isDisabled: true, isInvalid: true },
  ];

  for (const model of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(select, "data-disabled", styles.isDisabled, model.isDisabled === true),
        ...agrees(select, "data-invalid", styles.isInvalid, model.isInvalid === true),
      );
    });
  }

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(Scene.selector("label")).toHaveClass(classOf(styles.label)),
      Scene.expect(Scene.selector("#language-description")).toHaveClass(
        classOf(styles.description),
      ),
    );
  });

  // `base` and `later` set the same property, so StyleX keeps only the class of the one that wins.
  const layered = viewWith(
    SelectStyle.view(
      Select.view,
      { select: styles.base },
      { select: (state) => state.isInvalid && styles.later },
    ),
  );

  for (const isInvalid of [true, false]) {
    it(`lets a later state style win only in its state: isInvalid ${isInvalid}`, () => {
      const [winner, loser] = isInvalid ? [styles.later, styles.base] : [styles.base, styles.later];

      Scene.scene(
        { update, view: layered },
        Scene.given({ ...unset, isInvalid }),
        Scene.expect(select).toHaveClass(classOf(winner)),
        Scene.expect(select).not.toHaveClass(classOf(loser)),
      );
    });
  }

  it("still reports the chosen value", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.change(select, "en"),
      Scene.expect(select).toHaveValue("en"),
    );
  });
});
