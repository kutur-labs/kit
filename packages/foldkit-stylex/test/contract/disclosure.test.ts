import type { HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { DisclosureStyle } from "../../src/index.ts";
import { agrees, classOf } from "../classes.ts";

const styles = stylex.create({
  isOpen: { color: "red" },
  isDisabled: { opacity: 0.5 },
  later: { color: "blue" },
});

const flags = (state: DisclosureStyle.State) => [
  state.isOpen && styles.isOpen,
  state.isDisabled && styles.isDisabled,
];

const disclosureView = DisclosureStyle.view(Disclosure.view, { button: flags, panel: flags });

// The optional config this test varies, left out where it checks the default.
type Model = Pick<Disclosure.ViewConfig<boolean>, "isOpen" | "isDisabled">;

// The open state the click asks for is the whole Message. The panel renders through
// animatePanel, where @foldkit/ui wraps it.
const viewWith = (styledView: typeof disclosureView) => (model: Model, h: HtmlBuilder<boolean>) =>
  styledView(
    {
      ...model,
      id: "notes",
      onToggle: (isOpen) => isOpen,
      toView: ({ button, panel, animatePanel }) =>
        h.div(
          [],
          [h.button([...button], ["Notes"]), animatePanel(h.div([...panel], ["Two days."]))],
        ),
    },
    h,
  );

const view = viewWith(disclosureView);

const update = (model: Model, isOpen: boolean) => ({ model: { ...model, isOpen } });

const unset: Model = { isOpen: false };

const button = Scene.selector("#notes-button");

const panel = Scene.selector("#notes-panel");

describe("DisclosureStyle.view", () => {
  const scenarios: ReadonlyArray<Model> = [
    unset,
    { ...unset, isOpen: true },
    { isOpen: false, isDisabled: false },
    { ...unset, isDisabled: true },
  ];

  for (const model of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(button, "data-open", styles.isOpen, model.isOpen),
        ...agrees(panel, "data-open", styles.isOpen, model.isOpen),
        ...agrees(button, "data-disabled", styles.isDisabled, model.isDisabled === true),
      );
    });
  }

  // `isOpen` and `later` set the same property, so StyleX keeps only the later layer's class.
  for (const [name, layered] of [
    [
      "static, then stateful",
      DisclosureStyle.view(
        Disclosure.view,
        { panel: styles.isOpen },
        { panel: () => styles.later },
      ),
    ],
    [
      "stateful, then static",
      DisclosureStyle.view(
        Disclosure.view,
        { panel: () => styles.isOpen },
        { panel: styles.later },
      ),
    ],
  ] as const) {
    it(`lets a later styles object win property by property: ${name}`, () => {
      Scene.scene(
        { update, view: viewWith(layered) },
        Scene.given(unset),
        Scene.expect(panel).toHaveClass(classOf(styles.later)),
        Scene.expect(panel).not.toHaveClass(classOf(styles.isOpen)),
      );
    });
  }

  it("still opens from a click", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(button),
      Scene.expect(panel).toHaveAttr("data-open"),
      Scene.expect(panel).toHaveClass(classOf(styles.isOpen)),
    );
  });
});
