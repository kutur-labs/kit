import type { Html, HtmlBuilder } from "foldkit/html";

import { Tabs } from "@foldkit/ui";
import { TabsStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Section = Schema.Literals(["Poems", "Notes", "Drafts"]);

type Section = typeof Section.Type;

const Sections = Tabs.create<Section>();

export const Model = Schema.Struct({ tabs: Tabs.Model, selected: Section });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotTabsMessage: { message: Tabs.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { tabs: Tabs.init({ id: "sections" }), selected: "Poems" },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTabsMessage: ({ message }) => {
      const next = Sections.update(model.tabs, message);

      return {
        model: { tabs: next.model, selected: next.outMessage?.value ?? model.selected },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotTabsMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  tablist: { display: "flex", gap: 4, borderBlockEndWidth: 1, borderBlockEndStyle: "solid" },
  tab: {
    minBlockSize: 44,
    paddingInline: 16,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
  },
  activeTab: { fontWeight: 700, textDecorationLine: "underline" },
  disabledTab: { opacity: 0.5 },
  // Every panel is mounted; the package hides the inactive ones after this display.
  panel: { display: "block", paddingBlock: 16 },
});

const tabsView = TabsStyle.view(Sections.view, {
  tablist: styles.tablist,
  tab: (state) => [
    styles.tab,
    state.isActive && styles.activeTab,
    state.isDisabled && styles.disabledTab,
  ],
  panel: styles.panel,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "sections",
    model: model.tabs,
    view: tabsView,
    viewInputs: {
      tabs: Section.literals,
      selectedValue: model.selected,
      ariaLabel: "Sections",
      panelMount: "All",
      isTabDisabled: (section) => section === "Drafts",
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
    toParentMessage: (message) => Message.GotTabsMessage({ message }),
  });
