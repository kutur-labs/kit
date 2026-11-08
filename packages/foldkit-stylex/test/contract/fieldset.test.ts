import type { HtmlBuilder } from "foldkit/html";

import { Fieldset } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { FieldsetStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isDisabled: { opacity: 0.5 },
  legend: { fontWeight: 700 },
  description: { fontStyle: "italic" },
  base: { borderColor: "gray" },
  later: { borderColor: "silver" },
});

const fieldsetView = FieldsetStyle.view(Fieldset.view, {
  fieldset: (state) => state.isDisabled && styles.isDisabled,
  legend: styles.legend,
  description: styles.description,
});

// The optional config this test varies, left out where it checks the default.
type Model = Pick<Fieldset.ViewConfig<never>, "isDisabled">;

const viewWith = (styledView: typeof fieldsetView) => (model: Model, h: HtmlBuilder<never>) =>
  styledView(
    {
      ...model,
      id: "address",
      hasDescription: true,
      toView: ({ fieldset, legend, description }) =>
        h.fieldset(
          [...fieldset],
          [h.legend([...legend], ["Address"]), h.p([...description], ["Where we send the zine"])],
        ),
    },
    h,
  );

const view = viewWith(fieldsetView);

const update = (model: Model) => ({ model });

const unset: Model = {};

const fieldset = Scene.selector("#address");

describe("FieldsetStyle.view", () => {
  for (const model of [unset, { isDisabled: false }, { isDisabled: true }]) {
    it(`sets its flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(fieldset, "data-disabled", styles.isDisabled, model.isDisabled === true),
      );
    });
  }

  it("puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(Scene.selector("#address-legend")).toHaveClass(classOf(styles.legend)),
      Scene.expect(Scene.selector("#address-description")).toHaveClass(classOf(styles.description)),
    );
  });

  // `base` and `later` set the same property, so StyleX keeps only the class of the one that wins.
  const layered = viewWith(
    FieldsetStyle.view(
      Fieldset.view,
      { fieldset: styles.base },
      { fieldset: (state) => state.isDisabled && styles.later },
    ),
  );

  for (const isDisabled of [true, false]) {
    it(`lets a later state style win only in its state: isDisabled ${isDisabled}`, () => {
      const [winner, loser] = isDisabled
        ? [styles.later, styles.base]
        : [styles.base, styles.later];

      Scene.scene(
        { update, view: layered },
        Scene.given({ isDisabled }),
        Scene.expect(fieldset).toHaveClass(classOf(winner)),
        Scene.expect(fieldset).not.toHaveClass(classOf(loser)),
      );
    });
  }

  it("keeps its description linked", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.expect(fieldset).toHaveAccessibleDescription("Where we send the zine"),
    );
  });
});
