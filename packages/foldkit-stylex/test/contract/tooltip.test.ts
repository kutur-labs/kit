import type { HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { TooltipStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  panelVisible: { scale: 1 },
  panel: { padding: 8 },
  above: { zIndex: 20 },
});

const tooltipView = TooltipStyle.view(Tooltip.view, {
  trigger: (state) => [state.isVisible && styles.isVisible, state.isDisabled && styles.isDisabled],
  panel: (state) => [styles.panel, state.isVisible && styles.panelVisible],
});

// The optional inputs this test varies, left out where it checks their defaults.
type Model = Readonly<{ tooltip: Tooltip.Model; inputs: Pick<Tooltip.ViewInputs, "isDisabled"> }>;

// The panel stays rendered, so its flag is checked while hidden too.
const viewWith =
  (styledView: typeof tooltipView) => (model: Model, h: HtmlBuilder<Tooltip.Message>) =>
    styledView(
      model.tooltip,
      {
        ...model.inputs,
        anchor: { placement: "top" },
        toView: ({ trigger, panel }) =>
          h.div([], [h.button([...trigger], ["Save"]), h.div([...panel], ["Saves a draft"])]),
      },
      h,
    );

const view = viewWith(tooltipView);

const update = (model: Model, message: Tooltip.Message) => ({
  model: { ...model, tooltip: Tooltip.update(model.tooltip, message).model },
});

const hidden = Tooltip.init({ id: "save" });

const shown = { ...hidden, isOpen: true };

// The panel's Mount, which Scene requires resolved whenever the panel renders.
const mount = Scene.Mount.resolve(Tooltip.AnchorTooltip, Tooltip.Message.CompletedAnchorTooltip());

const trigger = Scene.selector("#save-trigger");

const panel = Scene.selector("#save-panel");

describe("TooltipStyle.view", () => {
  for (const [name, tooltip, isVisible] of [
    ["hidden", hidden, false],
    ["shown", shown, true],
  ] as const) {
    it(`sets isVisible on each part where @foldkit/ui sets data-open: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ tooltip, inputs: {} }),
        ...agrees(trigger, "data-open", styles.isVisible, isVisible),
        ...agrees(panel, "data-open", styles.panelVisible, isVisible),
        mount,
      );
    });
  }

  for (const inputs of [{}, { isDisabled: false }, { isDisabled: true }]) {
    it(`sets isDisabled where @foldkit/ui sets data-disabled: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ tooltip: hidden, inputs }),
        ...agrees(trigger, "data-disabled", styles.isDisabled, inputs.isDisabled === true),
        mount,
      );
    });
  }

  it("puts the functional CSS and each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given({ tooltip: shown, inputs: {} }),
      ...hasStyles(panel, anchored.panel, styles.panel),
      Scene.expect(panel).toHaveStyle("pointer-events", "none"),
      mount,
    );
  });

  it("lets the app's z-index replace the panel's default", () => {
    Scene.scene(
      { update, view: viewWith(TooltipStyle.view(Tooltip.view, { panel: styles.above })) },
      Scene.given({ tooltip: shown, inputs: {} }),
      ...hasStyles(panel, styles.above),
      Scene.expect(panel).not.toHaveClass(classOf(anchored.panel)),
      mount,
    );
  });

  it("still opens from keyboard focus on the styled trigger", () => {
    Scene.scene(
      { update, view },
      Scene.given({ tooltip: hidden, inputs: {} }),
      mount,
      Scene.focus(trigger),
      ...agrees(trigger, "data-open", styles.isVisible, true),
      ...agrees(panel, "data-open", styles.panelVisible, true),
    );
  });
});

describe("@foldkit/ui defects TooltipStyle works around", () => {
  it("F4: the panel has no z-index", () => {
    Scene.scene(
      { update, view },
      Scene.given({ tooltip: shown, inputs: {} }),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, "#save-panel"),
          "@foldkit/ui now sets Tooltip's panel z-index inline (F4). Drop anchored.panel from tooltip-style.ts, and from functional-styles.ts once no module uses it; update the README's What the package sets table. The inline drift test then asks for zIndex in the panel's owned family.",
        ).not.toHaveStyle("z-index");
      }),
      mount,
    );
  });
});
