import type { HtmlBuilder } from "foldkit/html";

import { HoverIntent } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { HoverIntentStyle } from "../../src/index.ts";
import { agrees } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  panelVisible: { visibility: "visible" },
});

const hoverIntentView = HoverIntentStyle.view(HoverIntent.view, {
  trigger: (state) => state.isVisible && styles.isVisible,
  panel: (state) => state.isVisible && styles.panelVisible,
});

// @foldkit/ui sets no attribute for isVisible, so the app marks each part with the one it gets.
const view = (model: HoverIntent.Model, h: HtmlBuilder<HoverIntent.Message>) =>
  hoverIntentView(
    model,
    {
      toView: ({ trigger, panel, isVisible }) => {
        const visible = isVisible ? [h.DataAttribute("visible", "")] : [];

        return h.div(
          [],
          [
            h.a([...trigger, ...visible, h.Id("trigger")], ["Profile"]),
            h.div([...panel, ...visible, h.Id("panel")], ["Signed in"]),
          ],
        );
      },
    },
    h,
  );

const update = (model: HoverIntent.Model, message: HoverIntent.Message) => ({
  model: HoverIntent.update(model, message).model,
});

const closed = HoverIntent.init();

const trigger = Scene.selector("#trigger");

const panel = Scene.selector("#panel");

describe("HoverIntentStyle.view", () => {
  for (const [name, model, isVisible] of [
    ["closed", closed, false],
    ["open", { ...closed, isOpen: true }, true],
  ] as const) {
    it(`sets isVisible on each part where @foldkit/ui passes it to toView: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(trigger, "data-visible", styles.isVisible, isVisible),
        ...agrees(panel, "data-visible", styles.panelVisible, isVisible),
      );
    });
  }

  it("still opens from focus on the styled trigger", () => {
    Scene.scene(
      { update, view },
      Scene.given(closed),
      Scene.focus(trigger),
      ...agrees(trigger, "data-visible", styles.isVisible, true),
      ...agrees(panel, "data-visible", styles.panelVisible, true),
    );
  });
});
