import type { Html, HtmlBuilder } from "foldkit/html";

import { Tabs } from "@foldkit/ui";
import { TabsStyle } from "@kutur-kit/foldkit-stylex";
import { tabsTheme } from "@kutur-kit/foldkit-stylex-theme/tabs";
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
  model: { tabs: Tabs.init({ id: "themed-sections" }), selected: "Poems" },
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

const tabsView = TabsStyle.view(Sections.view, tabsTheme);

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
