import type { Html, HtmlBuilder } from "foldkit/html";

import { Tabs } from "@foldkit/ui";
import { TabsStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";

type Section = "Poems" | "Notes";

/** Declared once at module scope, as @foldkit/ui asks. */
export const SectionTabs = Tabs.create<Section>();

export const sections = (model: Tabs.Model, selected: Section, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: tabsView,
    viewInputs: {
      tabs: ["Poems", "Notes"],
      selectedValue: selected,
      ariaLabel: "Sections",
      panelMount: "All",
      toView: ({ tablist, tabs }) =>
        h.div(
          [],
          [
            h.div(
              [...tablist],
              tabs.map((tab) => h.button([...tab.tab], [tab.value])),
            ),
            ...tabs.map((tab) => h.div([...tab.panel], [`${tab.value} go here.`])),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotSectionsMessage({ message }),
  });

const styles = stylex.create({
  tablist: { display: "flex", gap: 4 },
  vertical: { flexDirection: "column" },
  tab: {
    minBlockSize: 44,
    paddingInline: 16,
    borderBlockEndWidth: 2,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: "transparent",
    outline: { default: "none", ":focus-visible": "2px solid royalblue" },
  },
  activeTab: { borderBlockEndColor: "currentColor", fontWeight: 700 },
  disabledTab: { opacity: 0.5 },
  panel: { paddingBlock: 16 },
});

const tabsView = TabsStyle.view(SectionTabs.view, {
  tablist: (state) => [styles.tablist, state.orientation === "Vertical" && styles.vertical],
  tab: (state) => [
    styles.tab,
    state.isActive && styles.activeTab,
    state.isDisabled && styles.disabledTab,
  ],
  panel: styles.panel,
});

// Value must stay "Poems" | "Notes", not widen to string.
export const valueCheck = (
  render: Parameters<Parameters<typeof tabsView>[1]["toView"]>[0],
): Section | undefined => render.tabs[0]?.value;
