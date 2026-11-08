import type { HtmlBuilder } from "foldkit/html";

import { Tabs } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { TabsStyle } from "../../src/index.ts";
import { tabs as functional } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isHorizontal: { flexDirection: "row" },
  isActive: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  block: { display: "block" },
});

type Section = "Poems" | "Notes" | "Drafts";

const SectionTabs = Tabs.create<Section>();

const tabsView = TabsStyle.view(SectionTabs.view, {
  tablist: (state) => state.orientation === "Horizontal" && styles.isHorizontal,
  tab: (state) => [state.isActive && styles.isActive, state.isDisabled && styles.isDisabled],
  panel: (state) => [styles.block, state.isActive && styles.isActive],
});

// `orientation` is left out where the test checks its default.
type Model = Readonly<{
  tabs: Tabs.Model;
  selected: Section;
  inputs: Pick<Tabs.ViewInputs, "orientation">;
}>;

const view = (model: Model, h: HtmlBuilder<Tabs.Message>) =>
  tabsView(
    model.tabs,
    {
      tabs: ["Poems", "Notes", "Drafts"],
      selectedValue: model.selected,
      ariaLabel: "Sections",
      ...model.inputs,
      panelMount: "All",
      isTabDisabled: (value) => value === "Drafts",
      toView: ({ tablist, tabs }) =>
        h.div(
          [],
          [
            h.div(
              [...tablist, h.Id("tablist")],
              tabs.map((tab) => h.button([...tab.tab], [tab.value])),
            ),
            ...tabs.map((tab) => h.div([...tab.panel], [tab.value])),
          ],
        ),
    },
    h,
  );

const update = (model: Model, message: Tabs.Message) => {
  const next = SectionTabs.update(model.tabs, message);

  return {
    model: { ...model, tabs: next.model, selected: next.outMessage?.value ?? model.selected },
  };
};

const unset: Model = { tabs: Tabs.init({ id: "sections" }), selected: "Poems", inputs: {} };

const tablist = Scene.selector("#tablist");

describe("TabsStyle.view", () => {
  for (const [index, isActive, isDisabled] of [
    [0, true, false],
    [1, false, false],
    [2, false, true],
  ] as const) {
    it(`sets each flag of tab ${index} and its panel where @foldkit/ui sets its hook`, () => {
      const tab = Scene.selector(`#sections-tab-${index}`);
      const panel = Scene.selector(`#sections-panel-${index}`);

      Scene.scene(
        { update, view },
        Scene.given(unset),
        ...agrees(tab, "data-selected", styles.isActive, isActive),
        ...agrees(tab, "data-disabled", styles.isDisabled, isDisabled),
        ...agrees(panel, "data-selected", styles.isActive, isActive),
      );
    });
  }

  it("hides each inactive panel after the app's display and keeps the active one shown", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      ...hasStyles(Scene.selector("#sections-panel-0"), styles.block),
      Scene.expect(Scene.selector("#sections-panel-0")).not.toHaveClass(classOf(functional.hidden)),
      ...hasStyles(Scene.selector("#sections-panel-1"), functional.hidden),
      Scene.expect(Scene.selector("#sections-panel-1")).not.toHaveClass(classOf(styles.block)),
    );
  });

  it("still selects a tab from a click, moving the hidden rule to the panel it left", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.click(Scene.selector("#sections-tab-1")),
      ...agrees(Scene.selector("#sections-tab-1"), "data-selected", styles.isActive, true),
      Scene.expect(Scene.selector("#sections-panel-1")).not.toHaveClass(classOf(functional.hidden)),
      ...hasStyles(Scene.selector("#sections-panel-0"), functional.hidden),
    );
  });

  for (const [inputs, orientation] of [
    [{}, "horizontal"],
    [{ orientation: "Horizontal" }, "horizontal"],
    [{ orientation: "Vertical" }, "vertical"],
  ] as const) {
    it(`sets orientation where @foldkit/ui sets aria-orientation: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ ...unset, inputs }),
        Scene.expect(tablist).toHaveAttr("aria-orientation", orientation),
        orientation === "horizontal"
          ? Scene.expect(tablist).toHaveClass(classOf(styles.isHorizontal))
          : Scene.expect(tablist).not.toHaveClass(classOf(styles.isHorizontal)),
      );
    });
  }
});

describe("@foldkit/ui defects TabsStyle works around", () => {
  // A hidden attribute alone would not do: an app's display beats the user agent's [hidden] rule.
  it('an inactive panel under panelMount "All" has no inline display', () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, "#sections-panel-1"),
          "@foldkit/ui now hides inactive tab panels inline under panelMount \"All\". Drop tabs.hidden from functional-styles.ts and its after-rule from tabs-style.ts; update the README's What the package sets table and Styles.panel's doc.",
        ).not.toHaveStyle("display");
      }),
    );
  });
});
